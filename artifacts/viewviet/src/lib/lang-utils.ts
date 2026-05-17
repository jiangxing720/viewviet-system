export const LANG_STORAGE_KEY = "vv-learn-languages";

export interface LangConfig {
  code: string;
  label: string;
  sublabel: string;
  photo: string;
  accent: string;
  enabled: boolean;
}

export const DEFAULT_LANGS: LangConfig[] = [
  { code: "vi", label: "越南语", sublabel: "Tiếng Việt", photo: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&auto=format&fit=crop", accent: "#f59e0b", enabled: true },
  { code: "en", label: "英语", sublabel: "English", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true },
  { code: "zh", label: "中文", sublabel: "普通话", photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80&auto=format&fit=crop", accent: "#ef4444", enabled: true },
  { code: "ko", label: "韩语", sublabel: "한국어", photo: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80&auto=format&fit=crop", accent: "#8b5cf6", enabled: true },
  { code: "es", label: "西班牙语", sublabel: "Español", photo: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=600&q=80&auto=format&fit=crop", accent: "#eab308", enabled: true },
  { code: "th", label: "泰语", sublabel: "ภาษาไทย", photo: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80&auto=format&fit=crop", accent: "#f97316", enabled: true },
  { code: "ja", label: "日语", sublabel: "日本語", photo: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80&auto=format&fit=crop", accent: "#ef4444", enabled: true },
  { code: "fr", label: "法语", sublabel: "Français", photo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true },
  { code: "de", label: "德语", sublabel: "Deutsch", photo: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&auto=format&fit=crop", accent: "#eab308", enabled: true },
  { code: "ru", label: "俄语", sublabel: "Русский", photo: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true },
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

export function getLangFlag(code: string): string {
  const flags: Record<string, string> = {
    vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷", es: "🇪🇸", th: "🇹🇭", ja: "🇯🇵", fr: "🇫🇷", de: "🇩🇪", ru: "🇷🇺"
  };
  return flags[code] || "🌍";
}
