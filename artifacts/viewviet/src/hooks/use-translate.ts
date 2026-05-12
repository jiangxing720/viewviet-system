import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const MEM: Map<string, string> = new Map();
const INFLIGHT: Map<string, Promise<string>> = new Map();
const STORE = "vv-tr";
type TLang = "en" | "vi";
const PAIR: Record<TLang, string> = { en: "zh-CN|en-GB", vi: "zh-CN|vi-VN" };

function skey(text: string, lang: TLang) {
  return `${STORE}:${lang}:${text.slice(0, 120)}`;
}
function fromStore(text: string, lang: TLang): string | null {
  try { return localStorage.getItem(skey(text, lang)); } catch { return null; }
}
function toStore(text: string, lang: TLang, val: string) {
  try { localStorage.setItem(skey(text, lang), val); } catch {}
}

async function translateText(text: string, lang: TLang): Promise<string> {
  if (!text?.trim()) return text;
  const k = `${lang}:${text}`;
  if (MEM.has(k)) return MEM.get(k)!;
  const cached = fromStore(text, lang);
  if (cached) { MEM.set(k, cached); return cached; }
  if (INFLIGHT.has(k)) return INFLIGHT.get(k)!;
  const p = (async () => {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${PAIR[lang]}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      const v: string = d.responseData?.translatedText ?? text;
      MEM.set(k, v);
      toStore(text, lang, v);
      return v;
    } catch {
      return text;
    } finally {
      INFLIGHT.delete(k);
    }
  })();
  INFLIGHT.set(k, p);
  return p;
}

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
    translateText(src, lang as TLang).then((t) => {
      if (keyRef.current === k) setOut(t);
    });
  }, [text, lang]);

  return out;
}
