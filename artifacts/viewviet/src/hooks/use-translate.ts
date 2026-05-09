import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "@/lib/translate";

export function useTranslate(text: string | undefined | null): string {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [out, setOut] = useState(text ?? "");
  const keyRef = useRef("");

  useEffect(() => {
    const src = text ?? "";
    setOut(src);
    if (!src || !["en", "vi"].includes(lang)) return;
    const k = `${lang}:${src}`;
    if (keyRef.current === k) return;
    keyRef.current = k;
    translateText(src, lang as "en" | "vi").then((t) => {
      if (keyRef.current === k) setOut(t);
    });
  }, [text, lang]);

  return out;
}
