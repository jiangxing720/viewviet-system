import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/seo";

import { DEFAULT_LANGS, LANG_STORAGE_KEY, fetchLanguagesApi, LangConfig } from "@/lib/lang-utils";

function loadLanguagesSync(): LangConfig[] {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LANGS;
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

function LangCard({ lang }: { lang: LangConfig }) {
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
          <p className="text-white/50 text-xs leading-snug mt-1 line-clamp-2">{lang.description || t(`learn.lang_${lang.code}_desc`)}</p>
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
  const [languages, setLanguages] = useState<LangConfig[]>(() => loadLanguagesSync().filter(l => l.enabled));

  useEffect(() => {
    fetchLanguagesApi().then(langs => {
      setLanguages(langs.filter(l => l.enabled));
    });

    const handler = () => {
      const raw = localStorage.getItem(LANG_STORAGE_KEY);
      if (raw) {
        try { setLanguages(JSON.parse(raw).filter((l: LangConfig) => l.enabled)); } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Seo
        title="语言学习"
        description="学越南语、英语、中文、韩语——词汇、场景对话、复杂语法，配真人语音朗读，专为东南亚华人设计。"
        path="/learn"
      />
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
            {t("learn.pick_hint", { defaultValue: "选择一门语言，开始你的学习之旅" })}
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
