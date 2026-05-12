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
  const pendingInterimRef = useRef("");
  const audioCtxRef = useRef<AnyAudioContext | null>(null);
  const isSpeakingTTSRef = useRef(false);
  const autoSpeakRef = useRef(autoSpeak);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { pushToTalkRef.current = pushToTalk; }, [pushToTalk]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  useEffect(() => {
    return () => {
      runRef.current = false;
      try { recARef.current?.abort(); } catch {}
      try { recBRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
    };
  }, []);

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

  function abortRec(speaker: "A" | "B") {
    const ref = speaker === "A" ? recARef : recBRef;
    try { ref.current?.abort(); } catch {}
    ref.current = null;
  }

  function destroyAllRec() {
    abortRec("A");
    abortRec("B");
  }

  // -----------------------------------------------------------------
  // launchListener — creates and starts ONE new recognizer for a speaker.
  // Call this only when the current recognizer has ended or was aborted.
  // Do NOT call this while the recognizer is already running — the
  // continuous=true instance handles multiple utterances on its own.
  // -----------------------------------------------------------------
  function launchListener(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;

    abortRec(speaker);
    pendingInterimRef.current = "";

    const lang = speaker === "A" ? langARef.current : langBRef.current;
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    const thisRef = speaker === "A" ? recARef : recBRef;

    rec.onresult = (e: SpeechRecognitionEvent) => {
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
        pendingInterimRef.current = interimText;
        setActiveSpeaker(speaker);
        setInterim(interimText);
      }
      if (finalText.trim()) {
        pendingInterimRef.current = "";
        setInterim("");
        // In "both" mode: abort the OTHER listener to stop it processing the same audio.
        // The current speaker's recognizer (continuous=true) keeps running for the next utterance.
        if (directionRef.current === "both") {
          abortRec(speaker === "A" ? "B" : "A");
        }
        void handleSpeak(speaker, finalText.trim());
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionError(true);
        stopSession();
        return;
      }
      // On transient errors, restart this listener after a short delay
      if (runRef.current && thisRef.current === rec) {
        setTimeout(() => {
          if (runRef.current && thisRef.current === rec) launchListener(speaker);
        }, 300);
      }
    };

    rec.onend = () => {
      // Guard: ignore stale onend from a replaced recognizer
      if (thisRef.current !== rec) return;
      if (pushToTalkRef.current) {
        const pending = pendingInterimRef.current.trim();
        if (pending && runRef.current) {
          pendingInterimRef.current = "";
          setInterim("");
          void handleSpeak(speaker, pending);
        } else if (runRef.current) {
          setStatus("idle");
        }
      } else {
        // Natural end (silence timeout / browser limit) — restart this listener.
        // We use a short delay to let any in-flight translation settle.
        if (runRef.current) {
          setTimeout(() => {
            if (runRef.current && thisRef.current === rec) launchListener(speaker);
          }, 80);
        }
      }
    };

    thisRef.current = rec;
    try {
      rec.start();
      setStatus("listening");
    } catch {
      // start() can throw if another instance is starting — retry
      setTimeout(() => launchListener(speaker), 300);
    }
  }

  // -----------------------------------------------------------------
  // startListening — launches the right set of listeners based on mode.
  // Only call this at session start or after a full stop (not between utterances).
  // -----------------------------------------------------------------
  function startListening(forceSpeaker?: "A" | "B") {
    if (!SR || !runRef.current) return;
    const dir = directionRef.current;

    if (forceSpeaker) {
      launchListener(forceSpeaker);
      return;
    }

    if (dir === "a-to-b") {
      launchListener("A");
    } else if (dir === "b-to-a") {
      launchListener("B");
    } else {
      // Both — launch A immediately, B after short delay to avoid mic-start collision
      launchListener("A");
      setTimeout(() => { if (runRef.current) launchListener("B"); }, 150);
    }
  }

  // -----------------------------------------------------------------
  // handleSpeak — two paths depending on autoSpeak mode:
  //
  // autoSpeak=OFF (default): The continuous recognizer keeps running.
  //   Only restart the OTHER aborted listener (in "both" mode).
  //   Translation runs concurrently without interrupting listening.
  //
  // autoSpeak=ON: Block onresult processing during TTS via isSpeakingTTSRef.
  //   Sequence: translate → TTS reads aloud → then restart the other listener.
  //   The current speaker's continuous recognizer stays running (results ignored during TTS).
  // -----------------------------------------------------------------
  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current) return;

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const id   = crypto.randomUUID();

    setActiveSpeaker(speaker);
    setPendings((prev) => [...prev, { id, speaker, original }]);

    if (autoSpeakRef.current) {
      // ── Auto-speak path ────────────────────────────────────────────
      // Block onresult processing so TTS audio isn't re-recognised.
      // The current speaker's recognizer keeps running but results are ignored.
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
      }

      // After TTS: re-enable listening.
      // Current speaker's continuous recognizer is still running (or will restart via onend).
      // In "both" mode, also restart the OTHER listener that was aborted.
      if (runRef.current && !pushToTalkRef.current) {
        setStatus("listening");
        if (directionRef.current === "both") {
          const other = speaker === "A" ? "B" : "A";
          setTimeout(() => { if (runRef.current) launchListener(other); }, 100);
        }
      } else if (runRef.current) {
        setStatus("idle");
      }
    } else {
      // ── Normal path ────────────────────────────────────────────────
      // The current speaker's continuous recognizer is still running — don't touch it.
      // In "both" mode, restart ONLY the aborted OTHER listener.
      // Translation runs concurrently without interrupting listening.
      if (!pushToTalkRef.current) {
        setStatus("listening");
        if (directionRef.current === "both") {
          const other = speaker === "A" ? "B" : "A";
          setTimeout(() => { if (runRef.current) launchListener(other); }, 200);
        }
      } else {
        setStatus("idle");
      }
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
