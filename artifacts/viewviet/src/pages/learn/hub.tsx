import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const LANG_STORAGE_KEY = "vv-learn-languages";

const DEFAULT_LANGUAGES = [
  {
    code: "vi",
    nameKey: "learn.lang_vi",
    descKey: "learn.lang_vi_desc",
    photo: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&auto=format&fit=crop",
    accent: "#f59e0b",
    label: "越南语",
    sublabel: "Tiếng Việt",
    enabled: true,
  },
  {
    code: "en",
    nameKey: "learn.lang_en",
    descKey: "learn.lang_en_desc",
    photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&auto=format&fit=crop",
    accent: "#3b82f6",
    label: "英语",
    sublabel: "English",
    enabled: true,
  },
  {
    code: "zh",
    nameKey: "learn.lang_zh",
    descKey: "learn.lang_zh_desc",
    photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80&auto=format&fit=crop",
    accent: "#ef4444",
    label: "中文",
    sublabel: "普通话",
    enabled: true,
  },
  {
    code: "ko",
    nameKey: "learn.lang_ko",
    descKey: "learn.lang_ko_desc",
    photo: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80&auto=format&fit=crop",
    accent: "#8b5cf6",
    label: "韩语",
    sublabel: "한국어",
    enabled: true,
  },
];

function loadLanguages() {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Merge with default nameKey/descKey for i18n
      return stored.map((l: any) => ({
        ...l,
        nameKey: `learn.lang_${l.code}`,
        descKey: `learn.lang_${l.code}_desc`,
      }));
    }
  } catch {}
  return DEFAULT_LANGUAGES;
}

function OrganicSvg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 700 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="620" cy="160" rx="320" ry="280" fill="rgba(13,115,119,0.28)" />
      <ellipse cx="100" cy="780" rx="380" ry="260" fill="rgba(13,115,119,0.22)" />
      <path d="M700 0 C680 120 560 180 480 320 C400 460 460 580 360 680 C260 780 80 800 0 900 L700 900 Z" fill="rgba(13,115,119,0.18)" />
      <path d="M0 0 C80 60 200 40 280 160 C360 280 280 420 360 520 C440 620 620 580 700 700 L700 0 Z" fill="rgba(13,115,119,0.12)" />
      <circle cx="580" cy="480" r="140" fill="rgba(13,115,119,0.14)" />
      <circle cx="160" cy="280" r="90" fill="rgba(13,115,119,0.10)" />
    </svg>
  );
}

function LangCard({ lang }: { lang: typeof DEFAULT_LANGUAGES[0] }) {
  const { t } = useTranslation();
  return (
    <Link href={`/learn/${lang.code}/words`}>
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]">
        {/* Photo background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${lang.photo})` }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 opacity-90" style={{ background: lang.accent }} />
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 gap-0.5">
          <p className="text-white font-bold text-xl leading-tight drop-shadow">{lang.label}</p>
          <p className="text-white/60 text-xs font-medium tracking-wide">{lang.sublabel}</p>
          <p className="text-white/50 text-xs leading-snug mt-1 line-clamp-2">{t(lang.descKey)}</p>
        </div>
        {/* Arrow */}
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function LearnHub() {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState(() => loadLanguages().filter((l: any) => l.enabled !== false));

  // Reload if storage changes (admin saves)
  useEffect(() => {
    const handler = () => setLanguages(loadLanguages().filter((l: any) => l.enabled !== false));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Left panel: Language selection ── */}
      <div className="w-full md:w-[42%] flex flex-col justify-center px-6 py-10 md:px-12 md:py-16 bg-background">
        <div className="max-w-sm mx-auto md:mx-0 w-full space-y-7">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t("learn.title")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("learn.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang: any) => (
              <LangCard key={lang.code} lang={lang} />
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-left">
            {t("learn.pick_hint", { defaultValue: "选择一门语言,开始你的学习之旅" })}
          </p>
        </div>
      </div>

      {/* ── Right panel: Dark teal ── */}
      <div
        className="hidden md:flex md:w-[58%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: "linear-gradient(145deg, #071a1a 0%, #0c2424 45%, #061414 100%)" }}
      >
        <OrganicSvg />
        <div className="relative z-10 text-center px-12 max-w-lg space-y-6">
          <div className="space-y-3">
            <p className="text-[#4dbdc0] text-sm font-medium uppercase tracking-widest">
              ViewViet · 学习中心
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              探索东南亚<br />流利跨文化
            </h2>
            <p className="text-[#8ecfd1] text-base leading-relaxed">
              越南语 · 英语 · 中文 · 韩语<br />
              情景对话、词汇速记、长难句精讲
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { num: "4+", label: "语言" },
              { num: "1000+", label: "词汇" },
              { num: "500+", label: "例句" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.num}</p>
                <p className="text-xs text-[#8ecfd1] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
