import { useState, useEffect, useCallback } from "react";

const LANG_MAP: Record<string, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  ko: "ko-KR",
  es: "es-ES",
  th: "th-TH",
  ja: "ja-JP",
  fr: "fr-FR",
  de: "de-DE",
  ru: "ru-RU",
};

// Youdao language codes
const YOUDAO_LANG_MAP: Record<string, string> = {
  vi: "vi",
  en: "en",
  zh: "zh",
  ko: "ko",
  es: "es",
  th: "th",
  ja: "jap",
  fr: "fr",
  de: "de",
  ru: "ru",
};

// Google TTS language codes
const GOOGLE_LANG_MAP: Record<string, string> = {
  vi: "vi",
  en: "en",
  zh: "zh-CN",
  ko: "ko",
  es: "es",
  th: "th",
  ja: "ja",
  fr: "fr",
  de: "de",
  ru: "ru",
};

// Detect iOS / Safari — these need special TTS handling
const isIOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const isSafari =
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// On iOS/Safari, Audio().play() is unreliable for TTS (silently blocked or
// delayed). We use speechSynthesis as primary and Audio as fallback elsewhere.
const preferSpeechSynthesis = isIOS || isSafari;

// -----------------------------------------------------------------------
// Voice source definitions
// -----------------------------------------------------------------------
export type VoiceSourceId =
  | "online-youdao"
  | "online-google"
  | "local-speech";

export interface VoiceOption {
  id: string;           // used as select value
  label: string;        // display label
  isOnline: boolean;
}

function buildVoiceOptions(lang: string, localVoices: SpeechSynthesisVoice[]): VoiceOption[] {
  const opts: VoiceOption[] = [];

  // ---- Online sources (non-iOS only — on iOS we skip Audio-based sources) ----
  if (!preferSpeechSynthesis) {
    opts.push({ id: "online-youdao", label: "🌐 在线·有道原声 (推荐)", isOnline: true });
    opts.push({ id: "online-google", label: "🌐 在线·Google原声", isOnline: true });
  }

  // ---- Local speechSynthesis voices ----
  const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();
  const relevant = localVoices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );

  // Sort: local service → premium/enhanced → rest
  relevant.sort((a, b) => {
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    const aPrem = a.name.includes("Premium") || a.name.includes("Enhanced");
    const bPrem = b.name.includes("Premium") || b.name.includes("Enhanced");
    if (aPrem !== bPrem) return aPrem ? -1 : 1;
    return 0;
  });

  for (const v of relevant) {
    opts.push({
      id: `local:${v.name}`,
      label: `🔈 ${v.name}${v.localService ? "" : " (网络)"}`,
      isOnline: !v.localService,
    });
  }

  // On iOS: prepend the best local voice as the default at top
  if (preferSpeechSynthesis && relevant.length > 0) {
    // Add a "auto best" entry that always picks the best available
    opts.unshift({ id: "local-auto", label: "🔈 系统最佳音色 (推荐)", isOnline: false });
  } else if (!preferSpeechSynthesis) {
    // Already added online ones at top; nothing extra needed
  }

  // Fallback if nothing at all
  if (opts.length === 0) {
    opts.push({ id: "local-auto", label: "🔈 系统语音", isOnline: false });
  }

  return opts;
}

function getDefaultVoiceId(lang: string): string {
  // iOS: always use system voice by default
  if (preferSpeechSynthesis) return "local-auto";
  return "online-youdao";
}

// -----------------------------------------------------------------------
// Core speak helpers
// -----------------------------------------------------------------------

function speakViaSpeechSynthesis(
  text: string,
  lang: string,
  voiceName?: string
): void {
  if (!window.speechSynthesis) return;

  // iOS quirk: cancel any pending utterance first, then yield with a tiny
  // timeout so the browser fully releases the audio session before starting.
  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[lang] ?? lang;
    utter.rate = 0.92;

    const all = window.speechSynthesis.getVoices();
    const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();

    let chosen: SpeechSynthesisVoice | undefined;

    if (voiceName && voiceName !== "local-auto") {
      chosen = all.find((v) => v.name === voiceName);
    }

    if (!chosen) {
      // Pick best available for this language
      const candidates = all.filter((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      const local = candidates.find((v) => v.localService);
      const premium = candidates.find(
        (v) =>
          v.name.includes("Premium") ||
          v.name.includes("Enhanced") ||
          v.name.includes("Samantha") // iOS high-quality
      );
      chosen = premium ?? local ?? candidates[0];
    }

    if (chosen) utter.voice = chosen;

    // iOS bug: speechSynthesis sometimes stops mid-sentence on long texts.
    // Work-around: split on sentence boundaries and chain utterances.
    window.speechSynthesis.speak(utter);
  };

  // On iOS, a brief 10ms yield after cancel() helps the audio session reset.
  if (isIOS) {
    setTimeout(doSpeak, 10);
  } else {
    doSpeak();
  }
}

function speakViaAudio(url: string, onFail: () => void): void {
  const audio = new Audio(url);
  audio.play().catch(onFail);
}

// -----------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------
export function useTtsVoice(lang: string) {
  const storageKey = `vv-voice2-${lang}`;

  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>(
    () => localStorage.getItem(storageKey) ?? getDefaultVoiceId(lang)
  );

  // Load speechSynthesis voices
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis?.getVoices() ?? [];
      setLocalVoices(all);
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  const voiceOptions = buildVoiceOptions(lang, localVoices);

  // Ensure persisted selection is still valid; fall back to default
  const resolvedId =
    voiceOptions.find((o) => o.id === selectedId)?.id ??
    voiceOptions[0]?.id ??
    getDefaultVoiceId(lang);

  const selectVoice = useCallback(
    (id: string) => {
      setSelectedIdState(id);
      localStorage.setItem(storageKey, id);
    },
    [storageKey]
  );

  // ---- speak ----
  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const id = resolvedId;

      // Online: Youdao
      if (id === "online-youdao") {
        const youdaoLang = YOUDAO_LANG_MAP[lang] ?? lang;
        const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${youdaoLang}`;
        speakViaAudio(url, () => speakViaSpeechSynthesis(text, lang));
        return;
      }

      // Online: Google TTS
      if (id === "online-google") {
        const googleLang = GOOGLE_LANG_MAP[lang] ?? lang;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${googleLang}&client=tw-ob`;
        speakViaAudio(url, () => speakViaSpeechSynthesis(text, lang));
        return;
      }

      // Local auto or specific voice
      if (id === "local-auto") {
        speakViaSpeechSynthesis(text, lang);
        return;
      }

      if (id.startsWith("local:")) {
        const voiceName = id.slice(6);
        speakViaSpeechSynthesis(text, lang, voiceName);
        return;
      }

      // Fallback
      speakViaSpeechSynthesis(text, lang);
    },
    [resolvedId, lang]
  );

  // ---- makeUtterance (used by KtvText for boundary events) ----
  const makeUtterance = useCallback(
    (text: string): SpeechSynthesisUtterance => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANG_MAP[lang] ?? lang;
      utter.rate = 0.92;

      const all = window.speechSynthesis?.getVoices() ?? [];
      const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();

      let chosen: SpeechSynthesisVoice | undefined;

      if (resolvedId && resolvedId.startsWith("local:")) {
        const voiceName = resolvedId.slice(6);
        chosen = all.find((v) => v.name === voiceName);
      }

      if (!chosen) {
        const candidates = all.filter((v) =>
          v.lang.toLowerCase().startsWith(langPrefix)
        );
        const local = candidates.find((v) => v.localService);
        chosen = local ?? candidates[0];
      }

      if (chosen) utter.voice = chosen;
      return utter;
    },
    [resolvedId, lang]
  );

  // Legacy compat: voices list for VoiceSelector (now uses voiceOptions)
  // Keep `voices` as the old-style array for any component still using it
  const voices = voiceOptions.map((o) => ({
    name: o.id,
    label: o.label,
    lang,
    localService: !o.isOnline,
    voiceURI: o.id,
  })) as unknown as SpeechSynthesisVoice[];

  return {
    /** Full list of selectable voice options */
    voiceOptions,
    /** Legacy compat: same as voiceOptions mapped as SpeechSynthesisVoice */
    voices,
    selectedVoiceName: resolvedId,
    selectVoice,
    speak,
    makeUtterance,
    /** True when running on iOS/Safari (where Audio TTS is unreliable) */
    preferSpeechSynthesis,
  };
}
