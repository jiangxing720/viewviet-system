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

// Use VITE_API_URL at build time so requests reach Render backend on Hostinger
const API_BASE: string = (import.meta as any).env?.VITE_API_URL ?? "";

const BCP47: Record<LangCode, string> = {
  zh: "zh-CN",
  en: "en-US",
  vi: "vi-VN",
  ko: "ko-KR",
};

/** Detect language from text using character patterns */
function detectLangFromText(text: string): LangCode | null {
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return "zh";
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) return "ko";
  // Vietnamese diacritics
  if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/i.test(text)) return "vi";
  return null;
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
    const applyVoice = () => { const v = pickVoice(lang); if (v) utt.voice = v; };
    if (window.speechSynthesis.getVoices().length > 0) applyVoice();
    else window.speechSynthesis.addEventListener("voiceschanged", applyVoice, { once: true });
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    utt.onend = finish; utt.onerror = finish;
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
  const srRef = useRef<any>(null);
  // Which language is the recognition currently listening for
  const currentLangRef = useRef<LangCode>(langA);
  const isTTSRef = useRef(false);
  const pttActiveRef = useRef(false);
  const pendingFinalRef = useRef("");
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const directionRef = useRef(direction);
  const autoSpeakRef = useRef(autoSpeak);
  const pushToTalkRef = useRef(pushToTalk);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);
  useEffect(() => { pushToTalkRef.current = pushToTalk; }, [pushToTalk]);

  const supported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  /** Determine speaker from detected lang; fallback to current recognition lang */
  const resolveSpeaker = useCallback((detectedLang: LangCode | null): "A" | "B" => {
    const la = langARef.current;
    const lb = langBRef.current;
    if (detectedLang === la) return "A";
    if (detectedLang === lb) return "B";
    // Fallback: use whichever lang we were recognizing
    return currentLangRef.current === lb ? "B" : "A";
  }, []);

  /** Switch recognition to the other language */
  const switchLang = useCallback(() => {
    const la = langARef.current;
    const lb = langBRef.current;
    const next = currentLangRef.current === la ? lb : la;
    currentLangRef.current = next;
    if (srRef.current) {
      srRef.current.lang = BCP47[next];
    }
  }, []);

  const restartSR = useCallback(() => {
    if (!runRef.current || isTTSRef.current) return;
    if (pushToTalkRef.current && !pttActiveRef.current) return;
    try { srRef.current?.start(); } catch {}
  }, []);

  const processFinal = useCallback(async (text: string) => {
    if (!text.trim() || !runRef.current) return;

    const detected = detectLangFromText(text);
    const speaker = resolveSpeaker(detected);
    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;

    setActiveSpeaker(speaker);
    setInterim("");
    setStatus("translating");

    const pId = crypto.randomUUID();
    setPendings((prev) => [...prev, { id: pId, speaker, original: text }]);

    // Switch to other language for next utterance
    switchLang();

    try {
      const res = await fetch(`${API_BASE}/api/interpreter/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { translated?: string };
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
        srRef.current?.stop();
        await speakAsync(translated, to);
        isTTSRef.current = false;
      }
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setPendings((prev) => prev.filter((p) => p.id !== pId));
      if (runRef.current && !isTTSRef.current) {
        setStatus("listening");
        restartSR();
      }
    }
  }, [resolveSpeaker, switchLang, restartSR]);

  const buildSR = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const sr = new SR() as any;
    sr.lang = BCP47[currentLangRef.current];
    sr.continuous = true;
    sr.interimResults = true;
    sr.maxAlternatives = 1;

    sr.onresult = (event: any) => {
      if (!runRef.current || isTTSRef.current) return;
      if (pushToTalkRef.current && !pttActiveRef.current) return;

      let interimText = "";
      let newFinals = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) newFinals += r[0].transcript;
        else interimText += r[0].transcript;
      }

      if (interimText) setInterim(interimText);

      if (newFinals) {
        pendingFinalRef.current += newFinals;
        if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
        finalTimerRef.current = setTimeout(() => {
          const toSend = pendingFinalRef.current.trim();
          pendingFinalRef.current = "";
          if (toSend) void processFinal(toSend);
        }, 500);
      }
    };

    sr.onerror = (event: any) => {
      if (!runRef.current) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionError(true);
        return;
      }
      // Try switching language on error, then restart
      if (event.error !== "aborted" && event.error !== "no-speech") {
        switchLang();
      }
      setTimeout(() => restartSR(), 400);
    };

    sr.onend = () => {
      if (!runRef.current || isTTSRef.current) return;
      // Auto-switch language on each end event (natural cycling)
      if (directionRef.current === "both") switchLang();
      setTimeout(() => restartSR(), 200);
    };

    return sr;
  }, [processFinal, switchLang, restartSR]);

  const startSession = useCallback(async () => {
    if (!supported) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionError(false);
    } catch {
      setPermissionError(true);
      return;
    }

    currentLangRef.current = langARef.current;
    runRef.current = true;
    isTTSRef.current = false;
    pttActiveRef.current = false;
    pendingFinalRef.current = "";

    setRunning(true);
    setStatus("listening");

    const sr = buildSR();
    srRef.current = sr;

    if (!pushToTalkRef.current) {
      try { sr?.start(); } catch {}
    }
  }, [supported, buildSR]);

  const stopSession = useCallback(() => {
    runRef.current = false;
    isTTSRef.current = false;
    pttActiveRef.current = false;
    if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
    window.speechSynthesis?.cancel();
    try { srRef.current?.stop(); } catch {}
    srRef.current = null;
    setRunning(false);
    setStatus("idle");
    setInterim("");
  }, []);

  /** PTT: hold to speak */
  const startFor = useCallback((speaker: "A" | "B") => {
    if (!runRef.current) return;
    pttActiveRef.current = true;
    const lang = speaker === "A" ? langARef.current : langBRef.current;
    currentLangRef.current = lang;
    setActiveSpeaker(speaker);
    if (srRef.current) srRef.current.lang = BCP47[lang];
    try { srRef.current?.start(); } catch {}
    setStatus("listening");
  }, []);

  /** PTT: release */
  const stopListening = useCallback(() => {
    pttActiveRef.current = false;
    try { srRef.current?.stop(); } catch {}
    setStatus("idle");
  }, []);

  const replay = useCallback((exchange: Exchange) => {
    void speakAsync(exchange.translated, exchange.targetLang);
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
    setPendings([]);
  }, []);

  useEffect(() => () => { stopSession(); }, [stopSession]);

  return {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, supported,
    start: startSession, stop: stopSession,
    startFor, stopListening, replay, clearLog,
  };
}
