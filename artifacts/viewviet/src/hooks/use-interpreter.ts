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
// 700 ms feels snappy while still capturing natural mid-sentence pauses.
const COMMIT_SILENCE_MS = 700;

// After one speaker commits, wait this long before starting the other.
const RESTART_OTHER_DELAY_MS = 80;

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
  // In ping-pong "both" mode, tracks which speaker should start next (used by startListening after TTS).
  const nextSpeakerRef = useRef<"A" | "B">("B");

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
  // "PING-PONG" mode for "both" direction:
  //
  // Only ONE recognizer runs at a time. After A commits, A is stopped
  // and B starts. After B commits, B is stopped and A starts.
  //
  // This is reliable on all devices and makes the UI unambiguous:
  // the panel with the green "LISTENING" indicator is always clearly
  // the one the user should be speaking into.
  //
  // The user can also tap the INACTIVE panel at any time to manually
  // switch — handled by the switchTo() function returned from the hook.
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
      // Ping-pong: stop the speaker who just spoke, start the other.
      abortRec(speaker);
      const other = speaker === "A" ? "B" : "A";
      nextSpeakerRef.current = other;
      setTimeout(() => {
        if (runRef.current && !isSpeakingTTSRef.current) launchListener(other);
      }, RESTART_OTHER_DELAY_MS);
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
    rec.continuous = false;
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
            commitSpeech(speaker, pending);
          }, COMMIT_SILENCE_MS);
        }
      }

      if (finalText.trim()) {
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
      // Expected when we call abort() — ignore, no restart needed
      if (e.error === "aborted") return;

      // audio-capture: another recognizer is holding the mic (common on mobile).
      // Retry after a short delay — mic is released after each utterance with continuous=false.
      if (e.error === "audio-capture") {
        if (runRef.current && recRef.current === rec) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec) launchListener(speaker);
          }, 800);
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
        // Natural end — commit any pending interim that the silence timer missed
        // (some browsers fire onend before isFinal on short utterances)
        const pending = pendingRef.current.trim();
        if (pending && runRef.current && !isSpeakingTTSRef.current) {
          if (directionRef.current === "both" && !pushToTalkRef.current) {
            abortRec(speaker === "A" ? "B" : "A");
          }
          commitSpeech(speaker, pending);
        }
        // Do NOT restart during TTS playback — handleSpeak restarts listeners after TTS ends.
        if (runRef.current && !isSpeakingTTSRef.current) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec && !isSpeakingTTSRef.current) launchListener(speaker);
          }, 40);
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
  // "both" mode (ping-pong): always start with A first.
  //   After A commits → B starts; after B commits → A starts.
  //   Manual switchTo() overrides this at any time.
  //
  // Single direction: start only the relevant speaker.
  // -----------------------------------------------------------------
  function startListening(forceSpeaker?: "A" | "B") {
    if (!SR || !runRef.current) return;

    if (forceSpeaker) { launchListener(forceSpeaker); return; }

    const dir = directionRef.current;
    if (dir === "b-to-a") {
      launchListener("B");
    } else if (dir === "both") {
      // Ping-pong: use nextSpeakerRef so post-TTS restart goes to the correct side
      launchListener(nextSpeakerRef.current);
    } else {
      launchListener("A");
    }
  }

  // -----------------------------------------------------------------
  // switchTo — manually switch to the given speaker immediately.
  // Called when user taps the inactive panel in "both" auto mode.
  // -----------------------------------------------------------------
  function switchTo(to: "A" | "B") {
    if (!runRef.current) return;
    clearCommitTimer("A");
    clearCommitTimer("B");
    abortRec("A");
    abortRec("B");
    pendingInterimARef.current = "";
    pendingInterimBRef.current = "";
    setInterim("");
    setTimeout(() => { if (runRef.current) launchListener(to); }, 60);
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
      // Stop ALL recognizers BEFORE TTS to prevent the mic picking up the speaker.
      // We restart them ourselves once TTS is done.
      destroyAllRec();
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
        if (runRef.current) {
          setStatus("listening");
          // Restart both listeners now that TTS is finished.
          startListening();
        }
      }
      // Listeners restarted above — nothing else to do here.
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
    nextSpeakerRef.current = "A"; // always start with A in "both" mode
    ensureSilentAudio();
    // Warm up the translation API so the first real request isn't cold-start slow
    void fetch("/api/interpreter/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "你好", from: "zh", to: langBRef.current }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
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
    permissionError, start, stop, startFor, stopListening, switchTo, replay, clearLog,
    supported: !!SR,
  };
}
