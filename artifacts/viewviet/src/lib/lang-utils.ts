export const LANG_STORAGE_KEY = "vv-learn-languages";

export interface LangConfig {
  code: string;
  label: string;
  sublabel: string;
  photo: string;
  accent: string;
  enabled: boolean;
}

const DEFAULT_LANGS: LangConfig[] = [
  { code: "vi", label: "越南语", sublabel: "Tiếng Việt", photo: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&auto=format&fit=crop", accent: "#f59e0b", enabled: true },
  { code: "en", label: "英语", sublabel: "English", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true },
  { code: "zh", label: "中文", sublabel: "普通话", photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80&auto=format&fit=crop", accent: "#ef4444", enabled: true },
  { code: "ko", label: "韩语", sublabel: "한국어", photo: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80&auto=format&fit=crop", accent: "#8b5cf6", enabled: true },
];

export function getLangConfig(code: string): LangConfig | undefined {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw) {
      const langs: LangConfig[] = JSON.parse(raw);
      return langs.find(l => l.code === code) || DEFAULT_LANGS.find(l => l.code === code);
    }
  } catch {}
  return DEFAULT_LANGS.find(l => l.code === code);
}
