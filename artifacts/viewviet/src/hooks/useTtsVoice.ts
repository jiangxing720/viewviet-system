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

export function useTtsVoice(lang: string) {
  const storageKey = `vv-voice-${lang}`;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceNameState] = useState<string>(
    () => localStorage.getItem(storageKey) ?? ""
  );

  useEffect(() => {
    const langPrefix = (LANG_MAP[lang] ?? lang).slice(0, 2).toLowerCase();

    const load = () => {
      const all = window.speechSynthesis?.getVoices() ?? [];
      const filtered = all.filter((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      setVoices(filtered.length > 0 ? filtered : all);
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
    if (!selectedVoiceName) return undefined;
    return window.speechSynthesis?.getVoices().find((v) => v.name === selectedVoiceName);
  }, [selectedVoiceName]);

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANG_MAP[lang] ?? lang;
      const voice = getVoice();
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    },
    [lang, getVoice]
  );

  const makeUtterance = useCallback(
    (text: string): SpeechSynthesisUtterance => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANG_MAP[lang] ?? lang;
      const voice = getVoice();
      if (voice) utter.voice = voice;
      return utter;
    },
    [lang, getVoice]
  );

  return { voices, selectedVoiceName, selectVoice, speak, makeUtterance };
}
