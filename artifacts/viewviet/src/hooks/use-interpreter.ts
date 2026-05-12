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

interface SpeechRecognitionResult {
  readonly 0: { transcript: string };
  readonly length: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList;
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
      { signal: AbortSignal.timeout(7000) }
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
    utt.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const prefix = BCP47[lang].slice(0, 2).toLowerCase();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (voice) utt.voice = voice;
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    utt.onend = done;
    utt.onerror = done;
    window.speechSynthesis.speak(utt);
    setTimeout(done, Math.max(text.length * 150 + 2000, 4000));
  });
}

export function useInterpreter(langA: LangCode, langB: LangCode) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [log, setLog] = useState<Exchange[]>([]);

  const runRef = useRef(false);
  const busyRef = useRef(false);
  const recARef = useRef<SpeechRecognitionInstance | null>(null);
  const recBRef = useRef<SpeechRecognitionInstance | null>(null);
  const langARef = useRef(langA);
  const langBRef = useRef(langB);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);

  useEffect(() => {
    return () => {
      runRef.current = false;
      try { recARef.current?.abort(); } catch {}
      try { recBRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  function createRec(lang: LangCode, speaker: "A" | "B"): SpeechRecognitionInstance | null {
    if (!SR) return null;
    const r = new SR();
    r.lang = BCP47[lang];
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) handleSpeak(speaker, text);
    };
    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      const err = e.error;
      if (err !== "aborted" && err !== "not-allowed" && runRef.current && !busyRef.current) {
        setTimeout(() => { try { r.start(); } catch {} }, 600);
      }
    };
    r.onend = () => {
      if (runRef.current && !busyRef.current) {
        setTimeout(() => { try { r.start(); } catch {} }, 150);
      }
    };
    return r;
  }

  function rebuildAndStart() {
    recARef.current = createRec(langARef.current, "A");
    recBRef.current = createRec(langBRef.current, "B");
    if (runRef.current && !busyRef.current) {
      setStatus("listening");
      try { recARef.current?.start(); } catch {}
      try { recBRef.current?.start(); } catch {}
    }
  }

  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current || busyRef.current) return;
    busyRef.current = true;

    try { recARef.current?.abort(); } catch {}
    try { recBRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to = speaker === "A" ? langBRef.current : langARef.current;

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
        rebuildAndStart();
      } else {
        setStatus("idle");
      }
    }
  }

  function start() {
    if (!SR || runRef.current) return;
    runRef.current = true;
    busyRef.current = false;
    setRunning(true);
    rebuildAndStart();
  }

  function stop() {
    runRef.current = false;
    busyRef.current = false;
    setRunning(false);
    setStatus("idle");
    try { recARef.current?.abort(); } catch {}
    try { recBRef.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  function replay(exchange: Exchange) {
    speakAsync(exchange.translated, exchange.targetLang);
  }

  function clearLog() {
    setLog([]);
  }

  return { running, status, log, start, stop, replay, clearLog, supported: !!SR };
}
