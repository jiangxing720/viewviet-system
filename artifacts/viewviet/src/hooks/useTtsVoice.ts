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

export function useTtsVoice(lang: string) {
  const storageKey = `vv-voice-${lang}`;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceNameState] = useState<string>(
    () => localStorage.getItem(storageKey) ?? "online-high-quality"
  );

  useEffect(() => {
    const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();

    const load = () => {
      const all = window.speechSynthesis?.getVoices() ?? [];
      const filtered = all.filter((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      
      // Sort: localService first, then Premium/Enhanced
      filtered.sort((a, b) => {
        if (a.localService !== b.localService) return a.localService ? -1 : 1;
        const aPremium = a.name.includes("Premium") || a.name.includes("Enhanced");
        const bPremium = b.name.includes("Premium") || b.name.includes("Enhanced");
        if (aPremium !== bPremium) return aPremium ? -1 : 1;
        return 0;
      });
      
      setVoices(filtered);
    };

    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, [lang]);

  const selectVoice = useCallback(
    (name: string) => {
      setSelectedVoiceNameState(name);
      localStorage.setItem(storageKey, name);
    },
    [storageKey]
  );

  const getVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    const all = window.speechSynthesis?.getVoices() ?? [];
    if (selectedVoiceName && selectedVoiceName !== "online-high-quality") {
      const found = all.find((v) => v.name === selectedVoiceName);
      if (found) return found;
    }
    const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();
    const available = all.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (available.length > 0) {
      const local = available.find(v => v.localService);
      return local ?? available[0];
    }
    return undefined;
  }, [selectedVoiceName, lang]);

  const speak = useCallback(
    (text: string) => {
      // 1. Play Youdao Online High-Quality TTS (China-friendly, extremely reliable)
      if (selectedVoiceName === "online-high-quality") {
        const audioLang = YOUDAO_LANG_MAP[lang] ?? lang;
        const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${audioLang}`;
        const audio = new Audio(url);
        audio.play().catch(() => {
          // Fallback to local SpeechSynthesis if Audio play is blocked
          fallbackLocalSpeech(text);
        });
        return;
      }

      fallbackLocalSpeech(text);
    },
    [lang, selectedVoiceName, getVoice]
  );

  const fallbackLocalSpeech = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[lang] ?? lang;
    const voice = getVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }, [lang, getVoice]);

  const makeUtterance = useCallback(
    (text: string): SpeechSynthesisUtterance => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANG_MAP[lang] ?? lang;
      const voice = getVoice();
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      return utter;
    },
    [lang, getVoice]
  );

  // Prepend online high quality option to voices list
  const allVoices = [
    {
      name: "online-high-quality",
      lang: lang,
      localService: true,
      voiceURI: "online-high-quality",
    } as any as SpeechSynthesisVoice,
    ...voices
  ];

  return { voices: allVoices, selectedVoiceName, selectVoice, speak, makeUtterance };
}
