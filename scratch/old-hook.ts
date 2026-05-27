import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export type LangCode = "zh" | "vi" | "en" | "ko";
export type DirectionMode = "auto" | "a-to-b" | "b-to-a";
export type InterpreterStatus = "idle" | "listening-a" | "listening-b" | "processing" | "error";

export interface Exchange {
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: string;
  timestamp: number;
}

export interface PendingExchange {
  text: string;
  speaker: "A" | "B";
}

const BCP47: Record<LangCode, string> = {
  zh: "zh-CN",
  vi: "vi-VN",
  en: "en-US",
  ko: "ko-KR",
};

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";

export function useInterpreter(initialLangA: LangCode = "zh", initialLangB: LangCode = "vi") {
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [langA, setLangA] = useState<LangCode>(initialLangA);
  const [langB, setLangB] = useState<LangCode>(initialLangB);
  
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pendingTextA, setPendingTextA] = useState("");
  const [pendingTextB, setPendingTextB] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Your browser does not support Speech Recognition. Please use Chrome.");
      return;
    }
    
    const sr = new SpeechRecognition();
    sr.continuous = true;
    sr.interimResults = true;
    
    sr.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeSpeaker = sr.activeSpeaker as "A" | "B";
      
      if (activeSpeaker === "A") {
        setPendingTextA(finalTranscript || interimTranscript);
      } else {
        setPendingTextB(finalTranscript || interimTranscript);
      }

      if (finalTranscript) {
        handleTranslation(finalTranscript, activeSpeaker);
      }
    };

    sr.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== "no-speech") {
        setStatus("idle");
      }
    };

    sr.onend = () => {
      setStatus((prev) => {
        if (prev.startsWith("listening")) return "idle";
        return prev;
      });
    };

    recognitionRef.current = sr;

    return () => {
      sr.stop();
    };
  }, []);

  const handleTranslation = async (text: string, speaker: "A" | "B") => {
    setStatus("processing");
    const from = speaker === "A" ? langA : langB;
    const to = speaker === "A" ? langB : langA;
    
    // Clear pending text
    if (speaker === "A") setPendingTextA("");
    else setPendingTextB("");

    try {
      const res = await fetch(`${API_BASE}/api/interpreter/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.translated) {
        setExchanges((prev) => [...prev, {
          speaker,
          original: text,
          translated: data.translated,
          targetLang: to,
          timestamp: Date.now()
        }]);
      } else {
        toast.error("Translation failed.");
      }
    } catch (e) {
      toast.error("Network error during translation.");
    } finally {
      setStatus("idle");
    }
  };

  const startListening = useCallback((speaker: "A" | "B") => {
    if (!recognitionRef.current) return;
    
    // Stop any existing recognition
    recognitionRef.current.stop();
    
    setTimeout(() => {
      try {
        const langCode = speaker === "A" ? langA : langB;
        recognitionRef.current.lang = BCP47[langCode] || "en-US";
        recognitionRef.current.activeSpeaker = speaker; // custom property
        recognitionRef.current.start();
        setStatus(speaker === "A" ? "listening-a" : "listening-b");
        setErrorMsg("");
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }, 100);
  }, [langA, langB]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setStatus("idle");
  }, []);

  const clearHistory = () => setExchanges([]);

  return {
    status,
    langA,
    langB,
    setLangA,
    setLangB,
    exchanges,
    pendingA: pendingTextA,
    pendingB: pendingTextB,
    errorMsg,
    startListening,
    stopListening,
    clearHistory
  };
}
