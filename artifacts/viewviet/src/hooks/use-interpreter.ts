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

/** Recognised text that is currently being translated (shown immediately as a pending card) */
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

  // Primary: OpenAI via API server (fast, accurate)
  try {
    const r = await fetch("/api/interpreter/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const d = await r.json() as { translated?: string };
      const v: string = d.translated ?? text;
      try { sessionStorage.setItem(k, v); } catch {}
      return v;
    }
  } catch {}

  // Fallback: MyMemory (when OpenAI content filter blocks or server error)
  const MM: Record<LangCode, string> = { zh: "zh-CN", en: "en-GB", vi: "vi-VN", ko: "ko-KR" };
  try {
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${MM[from]}|${MM[to]}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const d = await r.json() as { responseData?: { translatedText?: string } };
    const v: string = d.responseData?.translatedText ?? text;
    try { sessionStorage.setItem(k, v); } catch {}
    return v;
  } catch {}

  return text;
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
  direction: DirectionMode = "both", pushToTalk = false,
) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [log, setLog] = useState<Exchange[]>([]);
  const [pendings, setPendings] = useState<PendingExchange[]>([]);
  const [interim, setInterim] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A");
  const [permissionError, setPermissionError] = useState(false);

  const runRef = useRef(false);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const nextSpeakerRef = useRef<"A" | "B">("A");
  const directionRef = useRef(direction);
  const pushToTalkRef = useRef(pushToTalk);
  const pendingInterimRef = useRef("");
  const audioCtxRef = useRef<AnyAudioContext | null>(null);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { pushToTalkRef.current = pushToTalk; }, [pushToTalk]);

  useEffect(() => {
    return () => {
      runRef.current = false;
      try { recRef.current?.abort(); } catch {}
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

  function destroyRec() {
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
  }

  function getNextSpeaker(current: "A" | "B"): "A" | "B" {
    const dir = directionRef.current;
    if (dir === "a-to-b") return "A";
    if (dir === "b-to-a") return "B";
    return current === "A" ? "B" : "A";
  }

  function startListening(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;

    destroyRec();
    pendingInterimRef.current = "";

    const lang = speaker === "A" ? langARef.current : langBRef.current;
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) {
        pendingInterimRef.current = interimText;
        setInterim(interimText);
      }
      if (finalText.trim()) {
        pendingInterimRef.current = "";
        setInterim("");
        // Fire-and-forget: translation runs async while recognition restarts immediately
        void handleSpeak(speaker, finalText.trim());
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionError(true);
        stopSession();
        return;
      }
      // no-speech: only restart if this rec is still the active one
      if (e.error === "no-speech" && runRef.current && recRef.current === rec) {
        setTimeout(() => {
          if (runRef.current && recRef.current === rec) {
            startListening(nextSpeakerRef.current);
          }
        }, 100);
      }
    };

    rec.onend = () => {
      // If a newer recognition is already running, do nothing — prevents double-start
      if (recRef.current !== rec) return;

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
        if (runRef.current) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec) {
              startListening(nextSpeakerRef.current);
            }
          }, 100);
        }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setActiveSpeaker(speaker);
      setStatus("listening");
    } catch {
      setTimeout(() => startListening(speaker), 200);
    }
  }

  // -----------------------------------------------------------------------
  // handleSpeak — decoupled from recognition restart.
  // Recognition for the next speaker starts IMMEDIATELY; translation runs
  // async in the background and adds to log when done.
  // -----------------------------------------------------------------------
  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current) return;

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const next = getNextSpeaker(speaker);
    const id   = crypto.randomUUID();

    // 1. Show original text immediately as a pending card (visible on both panels)
    setPendings((prev) => [...prev, { id, speaker, original }]);

    // 2. Restart recognition for the next speaker RIGHT NOW — don't wait for translation
    if (!pushToTalkRef.current) {
      nextSpeakerRef.current = next;
      setTimeout(() => startListening(next), 50);
    } else {
      setStatus("idle");
    }

    // 3. Translate in background
    try {
      const translated = await interpretTranslate(original, from, to);
      if (!runRef.current && pendings.length === 0) return; // session cleared
      const exchange: Exchange = { id, speaker, original, translated, targetLang: to, timestamp: Date.now() };
      setLog((prev) => [...prev, exchange]);
    } finally {
      // Remove from pendings whether translation succeeded or failed
      setPendings((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function stopSession() {
    runRef.current = false;
    setPendings([]);
    setRunning(false);
    setStatus("idle");
    setInterim("");
    destroyRec();
    try { window.speechSynthesis?.cancel(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }

  function start() {
    if (!SR || runRef.current) return;
    setPermissionError(false);
    ensureSilentAudio();
    runRef.current = true;
    const initial: "A" | "B" = direction === "b-to-a" ? "B" : "A";
    nextSpeakerRef.current = initial;
    setRunning(true);
    if (!pushToTalk) {
      startListening(initial);
    } else {
      setStatus("idle");
    }
  }

  function stop() { stopSession(); }

  function startFor(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;
    startListening(speaker);
  }

  function stopListening() {
    try { recRef.current?.stop(); } catch {}
  }

  function replay(exchange: Exchange) {
    if (!exchange.translated) return;
    // Pause recognition while TTS plays so the mic doesn't pick up the audio
    const wasContinuousListening = runRef.current && !pushToTalkRef.current;
    if (wasContinuousListening) destroyRec();

    void speakAsync(exchange.translated, exchange.targetLang).then(() => {
      // Resume recognition after TTS finishes
      if (wasContinuousListening && runRef.current) {
        setTimeout(() => startListening(nextSpeakerRef.current), 150);
      }
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
