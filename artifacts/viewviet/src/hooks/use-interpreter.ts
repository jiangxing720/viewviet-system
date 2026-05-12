import { useState, useRef, useEffect } from "react";

export type LangCode = "zh" | "en" | "vi" | "ko";
export type InterpreterStatus = "idle" | "listening" | "translating" | "speaking";

export interface Exchange {
  id: string;
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: LangCode;
  timestamp: number;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

const SR: SpeechRecognitionConstructor | undefined =
  typeof window !== "undefined"
    ? ((window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
       (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition)
    : undefined;

const BCP47: Record<LangCode, string> = {
  zh: "zh-CN",
  en: "en-US",
  vi: "vi-VN",
  ko: "ko-KR",
};

const MM_CODE: Record<LangCode, string> = {
  zh: "zh-CN",
  en: "en-GB",
  vi: "vi-VN",
  ko: "ko-KR",
};

async function interpretTranslate(text: string, from: LangCode, to: LangCode): Promise<string> {
  if (!text.trim() || from === to) return text;
  const k = `vv-interp:${from}>${to}:${text.slice(0, 80)}`;
  try {
    const c = sessionStorage.getItem(k);
    if (c) return c;
  } catch {}
  try {
    const lp = `${MM_CODE[from]}|${MM_CODE[to]}`;
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${lp}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const d = await r.json() as { responseData?: { translatedText?: string } };
    const v: string = d.responseData?.translatedText ?? text;
    try { sessionStorage.setItem(k, v); } catch {}
    return v;
  } catch {
    return text;
  }
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
    utt.onend = done;
    utt.onerror = done;
    window.speechSynthesis.speak(utt);
    // Fallback timeout: max(chars * 130ms + 2s, 5s)
    setTimeout(done, Math.max(text.length * 130 + 2000, 5000));
  });
}

export function useInterpreter(langA: LangCode, langB: LangCode) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [log, setLog] = useState<Exchange[]>([]);
  const [interim, setInterim] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A");
  const [permissionError, setPermissionError] = useState(false);

  // Use refs for values needed inside callbacks to avoid stale closures
  const runRef = useRef(false);
  const busyRef = useRef(false);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const nextSpeakerRef = useRef<"A" | "B">("A");

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runRef.current = false;
      try { recRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  function destroyRec() {
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
  }

  function startListening(speaker: "A" | "B") {
    if (!SR || !runRef.current || busyRef.current) return;

    destroyRec();

    const lang = speaker === "A" ? langARef.current : langBRef.current;
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.continuous = false;    // single-utterance: cleaner lifecycle
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        void handleSpeak(speaker, finalText.trim());
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionError(true);
        stopSession();
        return;
      }
      // no-speech: recognizer timed out waiting — restart silently
      if (e.error === "no-speech" && runRef.current && !busyRef.current) {
        setTimeout(() => startListening(nextSpeakerRef.current), 300);
      }
    };

    rec.onend = () => {
      // Only restart automatically if we're not mid-translation
      if (runRef.current && !busyRef.current) {
        setTimeout(() => startListening(nextSpeakerRef.current), 300);
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setActiveSpeaker(speaker);
      setStatus("listening");
    } catch {
      // start() can throw if called in quick succession
      setTimeout(() => startListening(speaker), 500);
    }
  }

  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current || busyRef.current) return;
    busyRef.current = true;

    destroyRec();
    window.speechSynthesis?.cancel();
    setInterim("");

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const replyFrom: "A" | "B" = speaker === "A" ? "B" : "A";

    setStatus("translating");
    try {
      const translated = await interpretTranslate(original, from, to);

      const exchange: Exchange = {
        id: crypto.randomUUID(),
        speaker,
        original,
        translated,
        targetLang: to,
        timestamp: Date.now(),
      };
      setLog((prev) => [...prev, exchange]);

      if (runRef.current) {
        setStatus("speaking");
        await speakAsync(translated, to);
      }
    } finally {
      busyRef.current = false;
      if (runRef.current) {
        // After A speaks, listen for B's reply — and vice versa
        nextSpeakerRef.current = replyFrom;
        setTimeout(() => startListening(replyFrom), 400);
      } else {
        setStatus("idle");
      }
    }
  }

  function stopSession() {
    runRef.current = false;
    busyRef.current = false;
    setRunning(false);
    setStatus("idle");
    setInterim("");
    destroyRec();
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  function start() {
    if (!SR || runRef.current) return;
    setPermissionError(false);
    runRef.current = true;
    busyRef.current = false;
    nextSpeakerRef.current = "A";
    setRunning(true);
    startListening("A");
  }

  function stop() {
    stopSession();
  }

  function replay(exchange: Exchange) {
    void speakAsync(exchange.translated, exchange.targetLang);
  }

  function clearLog() {
    setLog([]);
  }

  return {
    running,
    status,
    log,
    interim,
    activeSpeaker,
    permissionError,
    start,
    stop,
    replay,
    clearLog,
    supported: !!SR,
  };
}
