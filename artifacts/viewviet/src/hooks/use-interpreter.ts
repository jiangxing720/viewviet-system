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

// After this much silence following the last interim result, force-commit the utterance.
// zh fires isFinal quickly; vi/en/ko rely on this timer as their primary commit path.
const COMMIT_SILENCE_MS = 1400;

// After A commits a sentence, wait this long before starting B.
// Gives A time to keep talking without immediately handing off.
const RESTART_OTHER_DELAY_MS = 180;

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
  const recARef = useRef<SpeechRecognitionInstance | null>(null);
  const recBRef = useRef<SpeechRecognitionInstance | null>(null);

  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const directionRef = useRef(direction);
  const pushToTalkRef = useRef(pushToTalk);
  const autoSpeakRef = useRef(autoSpeak);

  // Per-speaker pending interim text — separate to prevent cross-speaker clobbering
  const pendingInterimARef = useRef("");
  const pendingInterimBRef = useRef("");

  const audioCtxRef = useRef<AnyAudioContext | null>(null);
  const isSpeakingTTSRef = useRef(false);

  // Per-speaker silence-commit timers
  const commitTimerARef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimerBRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /** Abort a speaker's recognizer and null its ref. Does NOT schedule a restart. */
  function abortRec(speaker: "A" | "B") {
    clearCommitTimer(speaker);
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
      const Ctor = (
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).AudioContext ??
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).webkitAudioContext
      );
      if (!Ctor) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new Ctor() as AnyAudioContext;
        createSilentLoop(audioCtxRef.current);
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume().then(() => { createSilentLoop(audioCtxRef.current!); });
      }
    } catch {}
  }

  // -----------------------------------------------------------------
  // "RACE" mode design for "both" direction:
  //
  // A and B recognizers run SIMULTANEOUSLY. Both listen all the time.
  // The correct language model fires confident results quickly; the
  // wrong-language model gets silence or garbled output.
  //
  // When EITHER fires a confident result:
  //   1. Abort the OTHER immediately (prevent their garbled result committing)
  //   2. Commit the winner's text
  //   3. Restart the OTHER after RESTART_OTHER_DELAY_MS
  //      (current speaker's continuous recognizer keeps running — no restart needed)
  //
  // On mobile Chrome where only ONE recognizer can hold the mic:
  //   The second one gets "audio-capture" → retries after 2 s.
  //   After any commit, both restart, giving the other a fresh attempt.
  //   In practice the mic is released between utterances, so both
  //   get a fair chance on the next round.
  // -----------------------------------------------------------------

  // -----------------------------------------------------------------
  // commitSpeech — finalises one utterance and manages listener state.
  // -----------------------------------------------------------------
  function commitSpeech(speaker: "A" | "B", text: string) {
    if (!runRef.current || !text.trim()) return;

    clearCommitTimer(speaker);

    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;
    pendingRef.current = "";
    setInterim("");

    if (!pushToTalkRef.current && directionRef.current === "both") {
      // Current speaker's continuous recognizer is still running — leave it.
      // Restart the other speaker so they can interject at any time.
      const other = speaker === "A" ? "B" : "A";
      setTimeout(() => { if (runRef.current) launchListener(other); }, RESTART_OTHER_DELAY_MS);
    }
    // Single direction: continuous recognizer stays running — nothing to do.
    // PTT: managed by startFor / stopListening.

    void handleSpeak(speaker, text);
  }

  // -----------------------------------------------------------------
  // launchListener — creates and starts ONE recognizer for a speaker.
  // -----------------------------------------------------------------
  function launchListener(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;

    const recRef = speaker === "A" ? recARef : recBRef;
    const commitTimerRef = speaker === "A" ? commitTimerARef : commitTimerBRef;
    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;

    // Abort any existing recognizer for this speaker (clean slate)
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
      // Block processing during TTS playback to prevent self-echo
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
        // PTT mode commits on button release — no timer needed there.
        if (!pushToTalkRef.current) {
          clearTimerRef(commitTimerRef);
          commitTimerRef.current = setTimeout(() => {
            commitTimerRef.current = null;
            if (!runRef.current || isSpeakingTTSRef.current) return;
            const pending = pendingRef.current;
            if (!pending.trim()) return;
            // Race: abort the other speaker before they can fire a wrong-language result
            if (directionRef.current === "both") abortRec(speaker === "A" ? "B" : "A");
            commitSpeech(speaker, pending);
          }, COMMIT_SILENCE_MS);
        }
      }

      if (finalText.trim()) {
        // Natural isFinal — race: abort the other speaker immediately
        clearTimerRef(commitTimerRef);
        if (directionRef.current === "both" && !pushToTalkRef.current) {
          abortRec(speaker === "A" ? "B" : "A");
        }
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
      // Expected when we call abort() — ignore, no restart needed
      if (e.error === "aborted") return;

      // audio-capture: another recognizer is holding the mic (common on mobile).
      // Retry after a longer delay to avoid hammering the browser.
      if (e.error === "audio-capture") {
        if (runRef.current && recRef.current === rec) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec) launchListener(speaker);
          }, 2000);
        }
        return;
      }

      // Other transient errors (no-speech, network): retry after 500 ms
      if (runRef.current && recRef.current === rec) {
        setTimeout(() => {
          if (runRef.current && recRef.current === rec) launchListener(speaker);
        }, 500);
      }
    };

    // ------ onend ------
    rec.onend = () => {
      if (recRef.current !== rec) return; // stale — already replaced

      if (pushToTalkRef.current) {
        // PTT: commit any pending interim when the button is released
        const pending = pendingRef.current.trim();
        if (pending && runRef.current) {
          pendingRef.current = "";
          setInterim("");
          void handleSpeak(speaker, pending);
        } else if (runRef.current) {
          setStatus("idle");
        }
      } else {
        // Natural end (browser silence timeout) — restart the same listener
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
      // start() can throw if the browser is momentarily busy — retry
      recRef.current = null;
      setTimeout(() => { if (runRef.current) launchListener(speaker); }, 400);
    }
  }

  // -----------------------------------------------------------------
  // startListening — initial listeners at session start.
  //
  // "both" mode: start BOTH A and B (race mode).
  //   A starts immediately, B starts 150 ms later (small stagger reduces
  //   simultaneous mic-grab conflicts on some browsers).
  //   On mobile where only one can hold the mic, the second gets
  //   audio-capture and retries every 2 s — still giving both a fair chance.
  //
  // Single direction: start only the relevant speaker.
  // -----------------------------------------------------------------
  function startListening(forceSpeaker?: "A" | "B") {
    if (!SR || !runRef.current) return;

    if (forceSpeaker) { launchListener(forceSpeaker); return; }

    const dir = directionRef.current;
    if (dir === "b-to-a") {
      launchListener("B");
    } else if (dir === "a-to-b") {
      launchListener("A");
    } else {
      // "both" — race mode: start both
      launchListener("A");
      setTimeout(() => { if (runRef.current) launchListener("B"); }, 150);
    }
  }

  // -----------------------------------------------------------------
  // handleSpeak — translate, log, and optionally TTS.
  // Listener management is handled by commitSpeech — not here.
  // -----------------------------------------------------------------
  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current) return;

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const id   = crypto.randomUUID();

    setActiveSpeaker(speaker);
    setPendings((prev) => [...prev, { id, speaker, original }]);

    if (autoSpeakRef.current) {
      isSpeakingTTSRef.current = true;
      setStatus("translating");
      try {
        const translated = await interpretTranslate(original, from, to);
        if (!runRef.current) return;
        setLog((prev) => [...prev, { id, speaker, original, translated, targetLang: to, timestamp: Date.now() }]);
        setPendings((prev) => prev.filter((p) => p.id !== id));
        setStatus("speaking");
        await speakAsync(translated, to);
      } finally {
        setPendings((prev) => prev.filter((p) => p.id !== id));
        isSpeakingTTSRef.current = false;
        if (runRef.current) setStatus("listening");
      }
      // Both listeners are already running or will restart naturally.
      // isSpeakingTTSRef was blocking them during TTS; now unblocked.
    } else {
      if (runRef.current) setStatus("listening");
      try {
        const translated = await interpretTranslate(original, from, to);
        if (!runRef.current) return;
        setLog((prev) => [...prev, { id, speaker, original, translated, targetLang: to, timestamp: Date.now() }]);
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

  function startFor(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;
    destroyAllRec();
    launchListener(speaker);
  }

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
