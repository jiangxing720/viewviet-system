import { useState, useEffect } from "react";

export const LANG_STORAGE_KEY = "vv-learn-languages";

export interface LangConfig {
  code: string;
  label: string;
  sublabel: string;
  photo: string;
  accent: string;
  enabled: boolean;
  description?: string;
}

export const DEFAULT_LANGS: LangConfig[] = [
  { code: "vi", label: "越南语", sublabel: "Tiếng Việt", photo: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&auto=format&fit=crop", accent: "#f59e0b", enabled: true, description: "专为赴越工作、经商、定居设计的零基础速成体系" },
  { code: "en", label: "英语", sublabel: "English", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true, description: "国际通用语言，连接东南亚华人社区与全球商务中心" },
  { code: "zh", label: "中文", sublabel: "普通话", photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80&auto=format&fit=crop", accent: "#ef4444", enabled: true, description: "面向东南亚本地员工与合作伙伴的基础中文交流" },
  { code: "ko", label: "韩语", sublabel: "한국어", photo: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80&auto=format&fit=crop", accent: "#8b5cf6", enabled: true, description: "实用韩语对话与商务场景交流指导" },
];

let cachedLangs: LangConfig[] | null = null;

const getApiUrl = (path: string): string => {
  const baseUrl = (import.meta.env as any).VITE_API_URL || "";
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}${path}`;
  }
  return path;
};

export async function fetchLanguagesApi(): Promise<LangConfig[]> {
  try {
    const res = await fetch(getApiUrl("/api/languages"));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedLangs = data;
        localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}
  return DEFAULT_LANGS;
}

export async function saveLanguagesApi(langs: LangConfig[]): Promise<boolean> {
  try {
    cachedLangs = langs;
    localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(langs));
    const token = localStorage.getItem("auth-token") || localStorage.getItem("vv-auth-token");
    const res = await fetch(getApiUrl("/api/admin/languages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ languages: langs })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getLangConfig(code: string): LangConfig | undefined {
  if (cachedLangs) return cachedLangs.find(l => l.code === code) || DEFAULT_LANGS.find(l => l.code === code);
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw) {
      const langs: LangConfig[] = JSON.parse(raw);
      return langs.find(l => l.code === code) || DEFAULT_LANGS.find(l => l.code === code);
    }
  } catch {}
  return DEFAULT_LANGS.find(l => l.code === code);
}

export function useLangConfig(code: string): LangConfig | undefined {
  const [config, setConfig] = useState<LangConfig | undefined>(() => getLangConfig(code));
  
  useEffect(() => {
    fetchLanguagesApi().then(langs => {
      const found = langs.find(l => l.code === code) || DEFAULT_LANGS.find(l => l.code === code);
      if (found) setConfig(found);
    });
  }, [code]);
  
  return config;
}

export function getLangFlag(code: string): string {
  const flags: Record<string, string> = {
    vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷", es: "🇪🇸", th: "🇹🇭", ja: "🇯🇵", fr: "🇫🇷", de: "🇩🇪", ru: "🇷🇺"
  };
  return flags[code] || "🌍";
}
