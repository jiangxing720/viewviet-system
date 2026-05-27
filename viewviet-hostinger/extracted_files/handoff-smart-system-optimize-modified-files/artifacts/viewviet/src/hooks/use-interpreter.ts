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

const BCP47: Record<LangCode, string> = { zh: "zh-CN", en: "en-US", vi: "vi-VN", ko: "ko-KR" };
const FORMAT_BY_MIME: Array<[string, string]> = [
  ["webm", "webm"],
  ["mp4", "mp4"],
  ["mpeg", "mp3"],
  ["mp3", "mp3"],
  ["wav", "wav"],
  ["ogg", "ogg"],
];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor() {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

function audioFormatFromMime(mime: string) {
  const normalized = mime.toLowerCase();
  return FORMAT_BY_MIME.find(([needle]) => normalized.includes(needle))?.[1] ?? "webm";
}

function pickVoice(lang: LangCode): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const target = BCP47[lang].toLowerCase();
  const prefix = target.slice(0, 2);
  const exactLocal = voices.find((v) => v.lang.toLowerCase() === target && v.localService);
  if (exactLocal) return exactLocal;
  const exactAny = voices.find((v) => v.lang.toLowerCase() === target);
  if (exactAny) return exactAny;
  const prefixLocal = voices.find((v) => v.lang.toLowerCase().startsWith(prefix) && v.localService);
  if (prefixLocal) return prefixLocal;
  const prefixAny = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  return prefixAny ?? null;
}

function speakAsync(text: string, lang: LangCode): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = BCP47[lang];
    utt.rate = 0.9;
    const applyVoice = () => {
      const voice = pickVoice(lang);
      if (voice) utt.voice = voice;
    };
    if (window.speechSynthesis.getVoices().length > 0) applyVoice();
    else window.speechSynthesis.addEventListener("voiceschanged", applyVoice, { once: true });

    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    utt.onend = done; utt.onerror = done;
    window.speechSynthesis.speak(utt);
    setTimeout(done, Math.max(text.length * 130 + 2000, 5000));
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  
  // VAD refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const speakingRef = useRef(false);
  const silenceStartRef = useRef(0);
  const pttModeRef = useRef(pushToTalk);

  // Sync refs
  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const activeSpeakerRef = useRef<"A" | "B">("A");
  
  // Audio playback block to prevent mic from hearing the TTS
  const isSpeakingTTSRef = useRef(false);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { pttModeRef.current = pushToTalk; }, [pushToTalk]);
  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);

  const startLiveCaptions = () => {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition || speechRecognitionRef.current) return;

    const recognition: SpeechRecognitionLike = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = BCP47[activeSpeakerRef.current === "A" ? langARef.current : langBRef.current];
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      setInterim(text.trim());
    };
    recognition.onerror = () => setInterim("");
    recognition.onend = () => {
      if (!runRef.current) return;
      window.setTimeout(() => {
        try {
          recognition.lang = BCP47[activeSpeakerRef.current === "A" ? langARef.current : langBRef.current];
          recognition.start();
        } catch {}
      }, 250);
    };

    speechRecognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  };

  const stopLiveCaptions = () => {
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (!recognition) return;
    recognition.onend = null;
    try { recognition.stop(); } catch {}
    try { recognition.abort(); } catch {}
  };

  const processAudioChunk = async (blob: Blob) => {
    if (!runRef.current) return;
    try {
      setStatus("translating");
      const base64 = await blobToBase64(blob);
      // We use webm format natively if supported
      const format = audioFormatFromMime(blob.type || recorderRef.current?.mimeType || "audio/webm");
      
      const pId = crypto.randomUUID();
      setPendings(prev => [...prev, { id: pId, speaker: "A", original: "Audio processing..." }]);

      const res = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? ""}/api/interpreter/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          format,
          langA: langARef.current,
          langB: langBRef.current
        }),
      });

      setPendings(prev => prev.filter(p => p.id !== pId));

      if (res.ok) {
        const data = await res.json();
        if (!data.empty && data.original) {
          const exchange: Exchange = {
            id: crypto.randomUUID(),
            speaker: data.speaker,
            original: data.original,
            translated: data.translated,
            targetLang: data.targetLang as LangCode,
            timestamp: Date.now()
          };
          setActiveSpeaker(data.speaker);
          activeSpeakerRef.current = data.speaker;
          setLog(prev => [...prev, exchange]);

          if (autoSpeak) {
            isSpeakingTTSRef.current = true;
            setStatus("speaking");
            await speakAsync(exchange.translated, exchange.targetLang);
            isSpeakingTTSRef.current = false;
          }
        }
      }
    } catch (e) {
      console.error("Audio processing failed", e);
    } finally {
      if (runRef.current && !isSpeakingTTSRef.current) {
        setStatus("listening");
      }
    }
  };

  const setupVAD = (stream: MediaStream) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.minDecibels = -70;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    
    vadIntervalRef.current = window.setInterval(() => {
      if (!runRef.current || isSpeakingTTSRef.current || pttModeRef.current) {
        speakingRef.current = false;
        return;
      }
      
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;

      // Simple threshold
      if (avg > 5) {
        speakingRef.current = true;
        silenceStartRef.current = 0;
        setInterim("Listening...");
      } else {
        if (speakingRef.current) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 1500) {
            // Silence for 1.5 seconds -> trigger stop to send chunk
            speakingRef.current = false;
            silenceStartRef.current = 0;
            setInterim("");
            if (recorderRef.current && recorderRef.current.state === "recording") {
              recorderRef.current.stop(); // will trigger onstop and restart
            }
          }
        } else {
           if (Date.now() - silenceStartRef.current > 1500) setInterim("");
        }
      }
    }, 100);
  };

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionError(false);
      setRunning(true);
      runRef.current = true;
      setStatus(pushToTalk ? "idle" : "listening");

      setupVAD(stream);
      startLiveCaptions();

      const startRecorder = () => {
        if (!runRef.current) return;
        const options = { mimeType: 'audio/webm;codecs=opus' };
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch(e) {
          recorder = new MediaRecorder(stream);
        }
        
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            processAudioChunk(blob);
            chunksRef.current = [];
          }
          if (runRef.current && !pttModeRef.current) {
             // small delay to prevent rapid spinning
             setTimeout(() => {
                if (runRef.current && !isSpeakingTTSRef.current) startRecorder();
             }, 50);
          }
        };

        if (!pttModeRef.current) recorder.start();
      };

      startRecorder();

    } catch (err) {
      console.error(err);
      setPermissionError(true);
      stopSession();
    }
  };

  const stopSession = useCallback(() => {
    runRef.current = false;
    setRunning(false);
    setStatus("idle");
    setInterim("");
    stopLiveCaptions();
    
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(()=>{});
    
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  }, []);

  const startFor = (speaker: "A" | "B") => {
    if (!runRef.current || !streamRef.current) return;
    // For PTT mode, we start recording immediately
    setActiveSpeaker(speaker);
    activeSpeakerRef.current = speaker;
    if (recorderRef.current && recorderRef.current.state === "inactive") {
       recorderRef.current.start();
       setStatus("listening");
    }
  };

  const stopListening = () => {
    // For PTT mode, we stop recording
    if (recorderRef.current && recorderRef.current.state === "recording") {
       recorderRef.current.stop();
       setStatus("idle");
    }
  };

  const replay = (exchange: Exchange) => {
    void speakAsync(exchange.translated, exchange.targetLang);
  };

  const clearLog = () => {
    setLog([]);
    setPendings([]);
  };

  // Ensure stop on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, start: startSession, stop: stopSession, 
    startFor, stopListening, replay, clearLog,
    supported: !!window.MediaRecorder,
  };
}
