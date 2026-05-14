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

// ─── Web Speech API types (single-direction mode) ─────────────────────────────
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

// ─── Web Speech API constants ──────────────────────────────────────────────────
// After this much silence following the last interim result, force-commit.
const COMMIT_SILENCE_MS = 700;
const RESTART_DELAY_MS = 80;

// ─── Whisper VAD constants ─────────────────────────────────────────────────────
// RMS thresholds (0–1 range, time-domain). Tune if the mic is very quiet/loud.
const SPEECH_THRESHOLD = 0.012;   // RMS above this → speech detected
const SILENCE_THRESHOLD = 0.009;  // RMS below this → silence
// How long silence must last before we commit the captured audio.
// 1 400 ms is long enough to survive a belch, sigh, or brief thinking pause
// without splitting the utterance into two requests.
const SILENCE_COMMIT_MS = 1400;
// Sounds shorter than this are noise — don't send to Whisper.
const MIN_SPEECH_MS = 350;
const VAD_POLL_MS = 50;  // how often we read the analyser

// Whisper returns ISO-639-1 codes. Map them to our LangCode.
const WHISPER_LANG_MAP: Record<string, LangCode> = {
  zh: "zh", cmn: "zh", yue: "zh", chinese: "zh",
  en: "en", english: "en",
  vi: "vi", vietnamese: "vi",
  ko: "ko", korean: "ko",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

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

// ─── Hook ─────────────────────────────────────────────────────────────────────
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

  // ── Core refs ────────────────────────────────────────────────────────────
  const runRef = useRef(false);
  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const directionRef = useRef(direction);
  const pushToTalkRef = useRef(pushToTalk);
  const autoSpeakRef = useRef(autoSpeak);
  const isSpeakingTTSRef = useRef(false);
  const silentAudioCtxRef = useRef<AnyAudioContext | null>(null);

  // ── Web Speech API refs (single-direction + PTT) ─────────────────────────
  const recARef = useRef<SpeechRecognitionInstance | null>(null);
  const recBRef = useRef<SpeechRecognitionInstance | null>(null);
  const pendingInterimARef = useRef("");
  const pendingInterimBRef = useRef("");
  const commitTimerARef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimerBRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Whisper VAD refs ("both" auto mode) ──────────────────────────────────
  const micStreamRef = useRef<MediaStream | null>(null);
  const vadAudioCtxRef = useRef<AnyAudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadSpeakingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false); // prevent double-submit

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { pushToTalkRef.current = pushToTalk; }, [pushToTalk]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runRef.current = false;
      stopWhisperSession();
      clearTimerRef(commitTimerARef);
      clearTimerRef(commitTimerBRef);
      try { recARef.current?.abort(); } catch {}
      try { recBRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      try { silentAudioCtxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Generic helpers ───────────────────────────────────────────────────────
  function clearTimerRef(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (ref.current !== null) { clearTimeout(ref.current); ref.current = null; }
  }

  function clearIntervalRef(ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
    if (ref.current !== null) { clearInterval(ref.current); ref.current = null; }
  }

  function ensureSilentAudio() {
    try {
      type AC = typeof AudioContext;
      const Ctor = (
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).AudioContext ??
        (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).webkitAudioContext
      );
      if (!Ctor) return;
      if (!silentAudioCtxRef.current || silentAudioCtxRef.current.state === "closed") {
        silentAudioCtxRef.current = new Ctor() as AnyAudioContext;
        createSilentLoop(silentAudioCtxRef.current);
      } else if (silentAudioCtxRef.current.state === "suspended") {
        void silentAudioCtxRef.current.resume().then(() => { createSilentLoop(silentAudioCtxRef.current!); });
      }
    } catch {}
  }

  // ── Whisper VAD mode ("both" + auto) ─────────────────────────────────────

  function stopWhisperSession() {
    clearIntervalRef(vadIntervalRef);
    try { mediaRecorderRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    micStreamRef.current = null;
    try { (analyserRef.current?.context as AudioContext | undefined)?.close(); } catch {}
    analyserRef.current = null;
    try { if (vadAudioCtxRef.current?.state !== "closed") vadAudioCtxRef.current?.close(); } catch {}
    vadAudioCtxRef.current = null;
    vadSpeakingRef.current = false;
    silenceStartRef.current = null;
    speechStartRef.current = null;
    isSubmittingRef.current = false;
  }

  // Map Whisper's detected language code to our LangCode, then to a speaker.
  function mapToSpeaker(detectedLang: string): "A" | "B" | null {
    const normalized = detectedLang.toLowerCase().trim();
    const mapped: LangCode | undefined = WHISPER_LANG_MAP[normalized]
      ?? WHISPER_LANG_MAP[normalized.split("-")[0]];
    if (!mapped) return null;
    if (mapped === langARef.current) return "A";
    if (mapped === langBRef.current) return "B";
    return null;
  }

  async function submitAudioChunks(chunks: Blob[], mimeType: string) {
    if (!runRef.current || chunks.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const audioBlob = new Blob(chunks, { type: mimeType });
    const formData = new FormData();
    const ext = mimeType.includes("mp4") ? "audio.mp4"
      : mimeType.includes("ogg") ? "audio.ogg"
      : "audio.webm";
    formData.append("audio", audioBlob, ext);

    setStatus("translating");
    try {
      const resp = await fetch("/api/interpreter/transcribe", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok || !runRef.current) return;
      const { text, language } = await resp.json() as { text: string; language: string };
      if (!text?.trim() || !runRef.current) return;

      const speaker = mapToSpeaker(language);
      if (!speaker) {
        // Language not configured — show interim for debug, then discard
        setInterim(`[${language}] ${text}`);
        setTimeout(() => { if (runRef.current) setInterim(""); }, 2000);
        return;
      }
      setActiveSpeaker(speaker);
      setInterim("");
      await handleSpeak(speaker, text);
    } catch {
      // Network / timeout — silently discard; VAD loop continues
    } finally {
      isSubmittingRef.current = false;
      if (runRef.current) setStatus("listening");
    }
  }

  async function startWhisperSession() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micStreamRef.current = stream;

    // AudioContext for VAD
    type AC = typeof AudioContext;
    const Ctor = (
      (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).AudioContext ??
      (window as unknown as { AudioContext?: AC; webkitAudioContext?: AC }).webkitAudioContext
    )!;
    const ctx = new Ctor() as AnyAudioContext;
    vadAudioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    // MediaRecorder
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && runRef.current) audioChunksRef.current.push(e.data);
    };
    recorder.start(100); // collect chunks every 100 ms

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // VAD polling loop
    vadIntervalRef.current = setInterval(() => {
      if (!runRef.current) return;

      // During TTS playback: reset VAD state and discard buffered audio
      // to prevent the mic picking up the speaker output.
      if (isSpeakingTTSRef.current) {
        if (vadSpeakingRef.current) {
          vadSpeakingRef.current = false;
          silenceStartRef.current = null;
          speechStartRef.current = null;
          audioChunksRef.current = [];
        }
        return;
      }

      analyser.getByteTimeDomainData(dataArray);
      const rms = calcRMS(dataArray);

      if (rms >= SPEECH_THRESHOLD) {
        // ── Speech active ──────────────────────────────────────────────────
        if (!vadSpeakingRef.current) {
          // Transition: silence → speech
          vadSpeakingRef.current = true;
          speechStartRef.current = Date.now();
          audioChunksRef.current = []; // fresh buffer for this utterance
        }
        silenceStartRef.current = null; // reset silence clock on every speech frame
        setStatus("listening");
      } else {
        // ── Silence ────────────────────────────────────────────────────────
        if (vadSpeakingRef.current) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          }
          const silenceDuration = Date.now() - silenceStartRef.current;
          if (silenceDuration >= SILENCE_COMMIT_MS) {
            // Speech segment ended — commit
            const speechDuration = speechStartRef.current
              ? (silenceStartRef.current - speechStartRef.current)
              : 0;
            vadSpeakingRef.current = false;
            silenceStartRef.current = null;
            speechStartRef.current = null;

            if (speechDuration >= MIN_SPEECH_MS && !isSubmittingRef.current) {
              const chunks = [...audioChunksRef.current];
              audioChunksRef.current = [];
              void submitAudioChunks(chunks, recorder.mimeType || mimeType || "audio/webm");
            } else {
              audioChunksRef.current = [];
            }
          }
        }
      }
    }, VAD_POLL_MS);

    setStatus("listening");
  }

  // ── Web Speech API mode (single-direction + PTT) ──────────────────────────

  function clearCommitTimer(speaker: "A" | "B") {
    clearTimerRef(speaker === "A" ? commitTimerARef : commitTimerBRef);
  }

  function abortRec(speaker: "A" | "B") {
    clearCommitTimer(speaker);
    const ref = speaker === "A" ? recARef : recBRef;
    try { ref.current?.abort(); } catch {}
    ref.current = null;
  }

  function destroyAllRec() { abortRec("A"); abortRec("B"); }

  function commitSpeech(speaker: "A" | "B", text: string) {
    if (!runRef.current || !text.trim()) return;
    clearCommitTimer(speaker);
    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;
    pendingRef.current = "";
    setInterim("");
    void handleSpeak(speaker, text);
  }

  function launchListener(speaker: "A" | "B") {
    if (!SR || !runRef.current) return;

    const recRef = speaker === "A" ? recARef : recBRef;
    const commitTimerRef = speaker === "A" ? commitTimerARef : commitTimerBRef;
    const pendingRef = speaker === "A" ? pendingInterimARef : pendingInterimBRef;

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
        pendingRef.current = interimText;
        setActiveSpeaker(speaker);
        setInterim(interimText);
        if (!pushToTalkRef.current) {
          clearTimerRef(commitTimerRef);
          commitTimerRef.current = setTimeout(() => {
            commitTimerRef.current = null;
            if (!runRef.current || isSpeakingTTSRef.current) return;
            const pending = pendingRef.current;
            if (pending.trim()) { pendingRef.current = ""; setInterim(""); commitSpeech(speaker, pending); }
          }, COMMIT_SILENCE_MS);
        }
      }
      if (finalText) {
        clearTimerRef(commitTimerRef);
        pendingRef.current = "";
        setInterim("");
        commitSpeech(speaker, finalText);
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPermissionError(true); stopSession(); return;
      }
      if (e.error === "aborted") return;
      if (runRef.current && recRef.current === rec) {
        setTimeout(() => { if (runRef.current && recRef.current === rec) launchListener(speaker); }, 500);
      }
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (pushToTalkRef.current) {
        const pending = pendingRef.current.trim();
        if (pending && runRef.current) { pendingRef.current = ""; setInterim(""); void handleSpeak(speaker, pending); }
        else if (runRef.current) setStatus("idle");
      } else {
        const pending = pendingRef.current.trim();
        if (pending && runRef.current && !isSpeakingTTSRef.current) commitSpeech(speaker, pending);
        if (runRef.current && !isSpeakingTTSRef.current) {
          setTimeout(() => {
            if (runRef.current && recRef.current === rec && !isSpeakingTTSRef.current) launchListener(speaker);
          }, RESTART_DELAY_MS);
        }
      }
    };

    try { rec.start(); } catch {
      recRef.current = null;
      setTimeout(() => { if (runRef.current) launchListener(speaker); }, 400);
    }
  }

  function startListening(preferSpeaker?: "A" | "B") {
    if (!SR || !runRef.current) return;
    const dir = directionRef.current;
    if (preferSpeaker) { launchListener(preferSpeaker); return; }
    if (dir === "b-to-a") launchListener("B");
    else launchListener("A");
  }

  // ── handleSpeak — shared by both modes ────────────────────────────────────
  async function handleSpeak(speaker: "A" | "B", original: string) {
    if (!runRef.current) return;

    const from = speaker === "A" ? langARef.current : langBRef.current;
    const to   = speaker === "A" ? langBRef.current : langARef.current;
    const id   = crypto.randomUUID();

    setActiveSpeaker(speaker);
    setPendings((prev) => [...prev, { id, speaker, original }]);

    const isWhisperMode = directionRef.current === "both" && !pushToTalkRef.current;

    if (autoSpeakRef.current) {
      // Stop recognition before TTS to prevent self-echo
      if (isWhisperMode) {
        // VAD loop handles TTS flag — just set the flag; chunks are discarded in the loop
        audioChunksRef.current = [];
      } else {
        destroyAllRec();
      }
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
        audioChunksRef.current = []; // discard anything captured during TTS
        if (runRef.current) {
          setStatus("listening");
          if (!isWhisperMode) startListening();
        }
      }
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

  // ── Session control ───────────────────────────────────────────────────────
  function stopSession() {
    runRef.current = false;
    stopWhisperSession();
    clearTimerRef(commitTimerARef);
    clearTimerRef(commitTimerBRef);
    destroyAllRec();
    setPendings([]);
    setRunning(false);
    setStatus("idle");
    setInterim("");
    pendingInterimARef.current = "";
    pendingInterimBRef.current = "";
    try { window.speechSynthesis?.cancel(); } catch {}
    try { silentAudioCtxRef.current?.close(); } catch {}
    silentAudioCtxRef.current = null;
  }

  function start() {
    if (runRef.current) return;
    setPermissionError(false);
    ensureSilentAudio();
    // Warm up translation API
    void fetch("/api/interpreter/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "你好", from: "zh", to: langBRef.current }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
    runRef.current = true;
    setRunning(true);

    const isWhisperMode = direction === "both" && !pushToTalk;
    if (isWhisperMode) {
      setStatus("listening");
      startWhisperSession().catch((err: Error) => {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionError(true);
        }
        stopSession();
      });
    } else if (!pushToTalk) {
      startListening();
    } else {
      setStatus("idle");
    }
  }

  function stop() { stopSession(); }

  // PTT — explicit speaker selection via button press
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

  function clearLog() { setLog([]); setPendings([]); }

  return {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, start, stop, startFor, stopListening, replay, clearLog,
    supported: !!SR || typeof MediaRecorder !== "undefined",
  };
}
