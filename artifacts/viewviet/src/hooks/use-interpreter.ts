import { useState, useRef, useEffect, useCallback } from "react";

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

const BCP47: Record<LangCode, string> = {
  zh: "zh-CN",
  en: "en-US",
  vi: "vi-VN",
  ko: "ko-KR",
};

type SpeechRecognitionInstance = typeof window extends { SpeechRecognition: infer T }
  ? T extends new () => infer R ? R : never
  : never;

function createRecognition(lang: string): SpeechRecognitionInstance | null {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const sr = new SR() as any;
  sr.lang = lang;
  sr.continuous = true;
  sr.interimResults = true;
  sr.maxAlternatives = 1;
  return sr;
}

function pickVoice(lang: LangCode): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const target = BCP47[lang].toLowerCase();
  const prefix = target.slice(0, 2);
  return (
    voices.find((v) => v.lang.toLowerCase() === target && v.localService) ??
    voices.find((v) => v.lang.toLowerCase() === target) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix) && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

function speakAsync(text: string, lang: LangCode): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = BCP47[lang];
    utt.rate = 0.9;
    const applyVoice = () => {
      const v = pickVoice(lang);
      if (v) utt.voice = v;
    };
    if (window.speechSynthesis.getVoices().length > 0) applyVoice();
    else window.speechSynthesis.addEventListener("voiceschanged", applyVoice, { once: true });
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    utt.onend = finish;
    utt.onerror = finish;
    window.speechSynthesis.speak(utt);
    setTimeout(finish, Math.max(text.length * 130 + 2000, 6000));
  });
}

export function useInterpreter(
  langA: LangCode,
  langB: LangCode,
  direction: DirectionMode = "both",
  pushToTalk = false,
  autoSpeak = false,
) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [log, setLog] = useState<Exchange[]>([]);
  const [pendings, setPendings] = useState<PendingExchange[]>([]);
  const [interim, setInterim] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A");
  const [permissionError, setPermissionError] = useState(false);

  const runRef = useRef(false);
  const srARef = useRef<any>(null);
  const srBRef = useRef<any>(null);

  // PTT state
  const pttSpeakerRef = useRef<"A" | "B" | null>(null);

  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const autoSpeakRef = useRef(autoSpeak);
  const isTTSRef = useRef(false);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  const supported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const translate = useCallback(
    async (text: string, speaker: "A" | "B"): Promise<void> => {
      if (!text.trim()) return;

      const from = speaker === "A" ? langARef.current : langBRef.current;
      const to = speaker === "A" ? langBRef.current : langARef.current;

      const pId = crypto.randomUUID();
      setPendings((prev) => [...prev, { id: pId, speaker, original: text }]);
      setActiveSpeaker(speaker);
      setStatus("translating");

      try {
        const res = await fetch("/api/interpreter/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, from, to }),
        });
        const data = await res.json() as { translated?: string; error?: string };
        const translated = data.translated ?? text;

        const exchange: Exchange = {
          id: crypto.randomUUID(),
          speaker,
          original: text,
          translated,
          targetLang: to,
          timestamp: Date.now(),
        };
        setLog((prev) => [...prev, exchange]);

        if (autoSpeakRef.current && !isTTSRef.current) {
          isTTSRef.current = true;
          setStatus("speaking");
          // Pause recognition while speaking to avoid feedback loop
          srARef.current?.stop();
          srBRef.current?.stop();
          await speakAsync(translated, to);
          isTTSRef.current = false;
          // Resume recognition
          if (runRef.current) {
            setStatus("listening");
            try { srARef.current?.start(); } catch {}
            try { srBRef.current?.start(); } catch {}
          }
        }
      } catch (err) {
        console.error("Translation failed", err);
      } finally {
        setPendings((prev) => prev.filter((p) => p.id !== pId));
        if (runRef.current && !isTTSRef.current) setStatus("listening");
      }
    },
    []
  );

  const setupRecognition = useCallback(
    (speaker: "A" | "B", lang: LangCode) => {
      const sr = createRecognition(BCP47[lang]);
      if (!sr) return null;

      let finalBuffer = "";
      let finalTimer: ReturnType<typeof setTimeout> | null = null;

      (sr as any).onresult = (event: any) => {
        if (!runRef.current) return;
        if (isTTSRef.current) return;

        // In PTT mode, only accept results for the active speaker
        if (pushToTalk && pttSpeakerRef.current !== speaker) return;

        let interimText = "";
        let newFinals = "";

        for (let i = (event as any).resultIndex; i < (event as any).results.length; i++) {
          const result = (event as any).results[i];
          if (result.isFinal) {
            newFinals += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (interimText) setInterim(interimText);

        if (newFinals) {
          finalBuffer += newFinals;
          // Debounce: send after 600ms of no new finals
          if (finalTimer) clearTimeout(finalTimer);
          finalTimer = setTimeout(() => {
            const toSend = finalBuffer.trim();
            finalBuffer = "";
            setInterim("");
            if (toSend) void translate(toSend, speaker);
          }, 600);
        }
      };

      (sr as any).onerror = (event: any) => {
        if (!runRef.current) return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionError(true);
          return;
        }
        // network / no-speech errors — restart automatically
        if (event.error !== "aborted") {
          setTimeout(() => {
            if (runRef.current && !isTTSRef.current) {
              try { (sr as any).start(); } catch {}
            }
          }, 500);
        }
      };

      (sr as any).onend = () => {
        if (!runRef.current || isTTSRef.current) return;
        // In PTT mode only restart when this speaker is active
        if (pushToTalk && pttSpeakerRef.current !== speaker) return;
        setTimeout(() => {
          if (runRef.current && !isTTSRef.current) {
            try { (sr as any).start(); } catch {}
          }
        }, 200);
      };

      return sr;
    },
    [translate, pushToTalk]
  );

  const startSession = useCallback(async () => {
    if (!supported) return;

    // Request mic permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionError(false);
    } catch {
      setPermissionError(true);
      return;
    }

    runRef.current = true;
    setRunning(true);
    setStatus("listening");
    isTTSRef.current = false;

    // Create two recognition instances — one per language
    const srA = setupRecognition("A", langA);
    const srB = setupRecognition("B", langB);
    srARef.current = srA;
    srBRef.current = srB;

    if (!pushToTalk) {
      // Auto-detect mode: both run simultaneously
      const shouldStartA = direction === "both" || direction === "a-to-b";
      const shouldStartB = direction === "both" || direction === "b-to-a";
      if (shouldStartA && srA) try { (srA as any).start(); } catch {}
      if (shouldStartB && srB) try { (srB as any).start(); } catch {}
    }
    // PTT mode: wait for user to hold button
  }, [supported, langA, langB, direction, pushToTalk, setupRecognition]);

  const stopSession = useCallback(() => {
    runRef.current = false;
    setRunning(false);
    setStatus("idle");
    setInterim("");
    isTTSRef.current = false;
    window.speechSynthesis?.cancel();
    try { srARef.current?.stop(); } catch {}
    try { srBRef.current?.stop(); } catch {}
    srARef.current = null;
    srBRef.current = null;
  }, []);

  // PTT: start listening for a specific speaker
  const startFor = useCallback((speaker: "A" | "B") => {
    if (!runRef.current) return;
    pttSpeakerRef.current = speaker;
    setActiveSpeaker(speaker);
    const sr = speaker === "A" ? srARef.current : srBRef.current;
    if (sr) {
      try { (sr as any).start(); } catch {}
      setStatus("listening");
    }
  }, []);

  // PTT: release button
  const stopListening = useCallback(() => {
    pttSpeakerRef.current = null;
    try { srARef.current?.stop(); } catch {}
    try { srBRef.current?.stop(); } catch {}
    setStatus("idle");
  }, []);

  const replay = useCallback((exchange: Exchange) => {
    void speakAsync(exchange.translated, exchange.targetLang);
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
    setPendings([]);
  }, []);

  useEffect(() => {
    return () => { stopSession(); };
  }, [stopSession]);

  return {
    running,
    status,
    log,
    pendings,
    interim,
    activeSpeaker,
    permissionError,
    supported,
    start: startSession,
    stop: stopSession,
    startFor,
    stopListening,
    replay,
    clearLog,
  };
}
