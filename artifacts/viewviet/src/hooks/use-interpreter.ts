import { useState, useRef, useEffect } from "react";

export type LangCode = "zh" | "en" | "vi" | "ko";
export type InterpreterStatus = "idle" | "listening" | "translating" | "speaking";
export type DirectionMode = "both" | "a-to-b" | "b-to-a";

export interface Exchange {
  id: string;
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: LangCode;
  timestamp: number;
}

export interface PendingExchange {
  id: string;
  speaker: "A" | "B";
  original: string;
}

interface SpeechRecognitionAlternative { readonly transcript: string; }
interface SpeechRecognitionResult {
  readonly isFinal: boolean; readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number; [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList; readonly resultIndex: number;
}
interface SpeechRecognitionErrorEvent { readonly error: string; }
interface SpeechRecognitionInstance {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void; stop(): void;
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionInstance; }

const SR: SpeechRecognitionConstructor | undefined =
  typeof window !== "undefined"
    ? ((window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
       (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition)
    : undefined;

const BCP47: Record<LangCode, string> = { zh: "zh-CN", en: "en-US", vi: "vi-VN", ko: "ko-KR" };

// How long to wait after the last interim result before force-committing.
// Chinese fires isFinal quickly so the timer rarely triggers for zh.
// For vi/en/ko the silence timer is the primary commit path.
const COMMIT_SILENCE_MS = 1400;

async function interpretTranslate(text: string, from: LangCode, to: LangCode): Promise<string> {
  if (!text.trim() || from === to) return text;
  const k = `vv-interp:${from}>${to}:${text.slice(0, 80)}`;
  try { const c = sessionStorage.getItem(k); if (c) return c; } catch {}
  try {
    const r = await fetch("/api/interpreter/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }),
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json() as { translated?: string };
    const v: string = d.translated ?? text;
    try { sessionStorage.setItem(k, v); } catch {}
    return v;
  } catch { return text; }
}

function speakAsync(text: string, lang: LangCode): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = BCP47[lang];
    utt.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const prefix = BCP47[lang].slice(0, 2).toLowerCase();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (voice) utt.voice = voice;
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    utt.onend = done; utt.onerror = done;
    window.speechSynthesis.speak(utt);
    setTimeout(done, Math.max(text.length * 130 + 2000, 5000));
  });
}

type AnyAudioContext = AudioContext & { state: string };

function createSilentLoop(ctx: AnyAudioContext) {
  try {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    function scheduleNext() {
      if ((ctx as AnyAudioContext).state === "closed") return;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination);
      src.onended = scheduleNext; src.start();
    }
    scheduleNext();
  } catch {}
}

export function useInterpreter(
  langA: LangCode, langB: LangCode,
  direction: DirectionMode = "both", pushToTalk = false, autoSpeak = false,
) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [log, setLog] = useState<Exchange[]>([]);
  const [pendings, setPendings] = useState<PendingExchange[]>([]);
  const [interim, setInterim] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A");
  const [permissionError, setPermissionError] = useState(false);

  const runRef = useRef(false);
  // One recognizer per speaker (in "both" mode only ONE is running at a time — ping-pong)
  const recARef = useRef<SpeechRecognitionInstance | null>(null);
  const recBRef = useRef<SpeechRecognitionInstance | null>(null);

  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const directionRef = useRef(direction);
  const pushToTalkRef = useRef(pushToTalk);
  const autoSpeakRef = useRef(autoSpeak);

  // Per-speaker pending interim — separate refs prevent cross-speaker clobbering
  const pendingInterimARef = useRef("");
  const pendingInterimBRef = useRef("");

  const audioCtxRef = useRef<AnyAudioContext | null>(null);
  const isSpeakingTTSRef = useRef(false);

  // Per-speaker silence-commit timers (1.4s → commit current utterance)
  const commitTimerARef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimerBRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-speaker hand-off timers (3s after last activity → switch to the other speaker).
  // Resets on every interim or commit so A can speak multiple sentences before B's turn.
  const handoffTimerARef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handoffTimerBRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { pushToTalkRef.current = pushToTalk; }, [pushToTalk]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  useEffect(() => {
    return () => {
      runRef.current = false;
      clearTimerRef(commitTimerARef);
      clearTimerRef(commitTimerBRef);
      clearTimerRef(handoffTimerARef);
      clearTimerRef(handoffTimerBRef);
      try { recARef.current?.abort(); } catch {}
      try { recBRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
    };
  }, []);

  // ----------------------------------------------------------------- helpers

  function clearTimerRef(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (ref.current !== null) { clearTimeout(ref.current); ref.current = null; }
  }

  function clearCommitTimer(speaker: "A" | "B") {
    clearTimerRef(speaker === "A" ? commitTimerARef : commitTimerBRef);
  }

  function clearHandoffTimer(speaker: "A" | "B") {
    clearTimerRef(speaker === "A" ? handoffTimerARef : handoffTimerBRef);
  }

  /**
   * Schedule switching from `speaker` to the other speaker after HANDOFF_SILENCE_MS
   * of inactivity. Reset on every interim or commit so the speaker can say multiple
   * sentences without being interrupted. Only one listener runs at a time.
   */
  function scheduleHandoff(speaker: "A" | "B") {
    const ref = speaker === "A" ? handoffTimerARef : handoffTimerBRef;
    if (ref.current !== null) clearTimeout(ref.current);
    const other = speaker === "A" ? "B" : "A";
    ref.current = setTimeout(() => {
      ref.current = null;
      if (!runRef.current) return;
      // Abort current speaker, then start the other
      abortRec(speaker);
      setTimeout(() => { if (runRef.current) launchListener(other); }, 120);
    }, HANDOFF_SILENCE_MS);
  }

  /** Abort a speaker's recognizer and null its ref. Does NOT restart. */
  function abortRec(speaker: "A" | "B") {
    clearCommitTimer(speaker);
    clearHandoffTimer(speaker);
    const ref = speaker === "A" ? recARef : recBRef;
    try { ref.current?.abort(); } catch {}
    ref.current = null;
  }

  function destroyAllRec() {
    abortRec("A");
    abortRec("B");
  }

  function ensureSilentAudio() {
    try {
      type AC = typeof AudioContext;
      const AudioContextCtor = (
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).AudioContext ??
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).webkitAudioContext
      );
      if (!AudioContextCtor) return;
      if (!audioCtxRef.current || (audioCtxRef.current as AnyAudioContext).state === "closed") {
        audioCtxRef.current = new AudioContextCtor() as AnyAudioContext;
        createSilentLoop(audioCtxRef.current);
      } else if ((audioCtxRef.current as AnyAudioContext).state === "suspended") {
        void audioCtxRef.current.resume().then(() => { createSilentLoop(audioCtxRef.current!); });
      }
    } catch {}
  }

  // -----------------------------------------------------------------
  // commitSpeech — finalises one utterance and manages listener state.
  //
  // "both" mode (non-PTT): ping-pong — abort the speaker who just spoke,
  //   start the other speaker so ONLY ONE recognizer runs at a time.
  //   This prevents the dual-mic audio-capture error loop on mobile.
  //
  // Single-direction: the continuous recognizer keeps running — no restarts.
  //
  // PTT: listener lifecycle is managed by startFor/stopListening.
  // -----------------------------------------------------------------
  function commitSpeech(speaker: "A" | "B", text: string) {
    if (!runRef.current || !text.trim()) return;

    clearCommitTimer(speaker);

    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;
    pendingRef.current = "";
    setInterim("");

    if (!pushToTalkRef.current && directionRef.current === "both") {
      // Ping-pong: stop the speaker who just spoke, start the other
      abortRec(speaker);
      const other = speaker === "A" ? "B" : "A";
      setTimeout(() => { if (runRef.current) launchListener(other); }, 150);
    }
    // Single direction: continuous recognizer stays running — nothing to do.
    // PTT: handled by startFor / stopListening.

    void handleSpeak(speaker, text);
  }

  // -----------------------------------------------------------------
  // launchListener — creates and starts ONE new recognizer for a speaker.
  //
  // In "both" mode, only ONE listener runs at a time (ping-pong).
  // In single-direction mode, the continuous recognizer handles all utterances.
  // -----------------------------------------------------------------
  function launchListener(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;

    const recRef = speaker === "A" ? recARef : recBRef;
    const commitTimerRef = speaker === "A" ? commitTimerARef : commitTimerBRef;
    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;

    // Abort any existing recognizer for this speaker
    clearTimerRef(commitTimerRef);
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
    pendingRef.current = "";

    const lang = speaker === "A" ? langARef.current : langBRef.current;
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    recRef.current = rec;
    setActiveSpeaker(speaker);
    setStatus("listening");

    // ------ onresult ------
    rec.onresult = (e: SpeechRecognitionEvent) => {
      // Block processing during TTS to prevent speaker's audio being re-recognised
      if (isSpeakingTTSRef.current) return;

      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += t;
        else interimText += t;
      }

      if (interimText) {
        pendingRef.current = interimText;
        setActiveSpeaker(speaker);
        setInterim(interimText);

        // Silence-commit timer: fire after COMMIT_SILENCE_MS of no new speech.
        // This makes vi/en/ko as responsive as zh (which fires isFinal naturally).
        // PTT mode commits on button release — silence timer not needed there.
        if (!pushToTalkRef.current) {
          clearTimerRef(commitTimerRef);
          commitTimerRef.current = setTimeout(() => {
            commitTimerRef.current = null;
            // Guard: skip if TTS is playing or session stopped
            if (!runRef.current || isSpeakingTTSRef.current) return;
            const pending = pendingRef.current;
            if (pending.trim()) commitSpeech(speaker, pending);
          }, COMMIT_SILENCE_MS);
        }
      }

      if (finalText.trim()) {
        // Natural isFinal — cancel silence timer, commit immediately
        clearTimerRef(commitTimerRef);
        commitSpeech(speaker, finalText.trim());
      }
    };

    // ------ onerror ------
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionError(true);
        stopSession();
        return;
      }
      // "aborted" is expected when we call abort() — ignore, no restart
      if (e.error === "aborted") return;

      // Transient errors (no-speech, network): restart after a delay
      if (runRef.current && recRef.current === rec) {
        setTimeout(() => {
          if (runRef.current && recRef.current === rec) launchListener(speaker);
        }, 500);
      }
    };

    // ------ onend ------
    rec.onend = () => {
      // Stale recognizer (replaced by a newer one) — ignore
      if (recRef.current !== rec) return;

      if (pushToTalkRef.current) {
        // PTT: commit pending interim when button is released and recognizer stops
        const pending = pendingRef.current.trim();
        if (pending && runRef.current) {
          pendingRef.current = "";
          setInterim("");
          void handleSpeak(speaker, pending);
        } else if (runRef.current) {
          setStatus("idle");
        }
      } else {
        // Natural browser end (silence timeout / quota) — restart the same listener.
        // Short delay lets any in-flight translation settle.
        if (runRef.current) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec) launchListener(speaker);
          }, 80);
        }
      }
    };

    try {
      rec.start();
    } catch {
      // start() can throw if the browser is busy — retry after short delay
      recRef.current = null;
      setTimeout(() => { if (runRef.current) launchListener(speaker); }, 400);
    }
  }

  // -----------------------------------------------------------------
  // startListening — launches the initial listener(s) at session start.
  //
  // "both" mode: start A only. The ping-pong switches to B after A speaks.
  //   Starting both simultaneously causes audio-capture errors on mobile.
  //
  // Single direction: start only the relevant speaker.
  // -----------------------------------------------------------------
  function startListening(forceSpeaker?: "A" | "B") {
    if (!SR || !runRef.current) return;

    if (forceSpeaker) {
      launchListener(forceSpeaker);
      return;
    }

    const dir = directionRef.current;
    if (dir === "b-to-a") {
      launchListener("B");
    } else {
      // "a-to-b" and "both" both start with A
      launchListener("A");
    }
  }

  // -----------------------------------------------------------------
  // handleSpeak — translates original text, logs the exchange, optionally
  // reads the translation aloud via TTS.
  //
  // Listener management is NOT done here — commitSpeech handles it.
  // This function only handles translation, logging, and TTS.
  // -----------------------------------------------------------------
  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current) return;

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const id   = crypto.randomUUID();

    setActiveSpeaker(speaker);
    setPendings((prev) => [...prev, { id, speaker, original }]);

    if (autoSpeakRef.current) {
      // Auto-speak path: translate → TTS. Block onresult during TTS via flag.
      isSpeakingTTSRef.current = true;
      setStatus("translating");
      try {
        const translated = await interpretTranslate(original, from, to);
        if (!runRef.current) return;
        const exchange: Exchange = { id, speaker, original, translated, targetLang: to, timestamp: Date.now() };
        setLog((prev) => [...prev, exchange]);
        setPendings((prev) => prev.filter((p) => p.id !== id));

        setStatus("speaking");
        await speakAsync(translated, to);
      } finally {
        setPendings((prev) => prev.filter((p) => p.id !== id));
        isSpeakingTTSRef.current = false;
        if (runRef.current) setStatus("listening");
      }
      // Listeners: in "both" ping-pong mode, the other speaker's listener was
      // already started by commitSpeech. During TTS it was blocked by the flag;
      // now the flag is cleared so it can process speech normally.
      // In single-direction mode, the continuous listener is still running.
    } else {
      // Non-autoSpeak path: translate concurrently, no TTS.
      // Listeners are already managed by commitSpeech — nothing to do here.
      if (runRef.current) setStatus("listening");
      try {
        const translated = await interpretTranslate(original, from, to);
        if (!runRef.current) return;
        const exchange: Exchange = { id, speaker, original, translated, targetLang: to, timestamp: Date.now() };
        setLog((prev) => [...prev, exchange]);
      } finally {
        setPendings((prev) => prev.filter((p) => p.id !== id));
      }
    }
  }

  function stopSession() {
    runRef.current = false;
    setPendings([]);
    setRunning(false);
    setStatus("idle");
    setInterim("");
    pendingInterimARef.current = "";
    pendingInterimBRef.current = "";
    destroyAllRec();
    try { window.speechSynthesis?.cancel(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }

  function start() {
    if (!SR || runRef.current) return;
    setPermissionError(false);
    ensureSilentAudio();
    runRef.current = true;
    setRunning(true);
    if (!pushToTalk) {
      startListening();
    } else {
      setStatus("idle");
    }
  }

  function stop() { stopSession(); }

  /** PTT: start listening for a specific speaker (destroys any active listener). */
  function startFor(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;
    destroyAllRec();
    launchListener(speaker);
  }

  /** PTT: gracefully stop the active listener so it fires onend with pending results. */
  function stopListening() {
    try { recARef.current?.stop(); } catch {}
    try { recBRef.current?.stop(); } catch {}
  }

  function replay(exchange: Exchange) {
    isSpeakingTTSRef.current = true;
    void speakAsync(exchange.translated, exchange.targetLang).then(() => {
      isSpeakingTTSRef.current = false;
    });
  }

  function clearLog() {
    setLog([]);
    setPendings([]);
  }

  return {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, start, stop, startFor, stopListening, replay, clearLog,
    supported: !!SR,
  };
}
