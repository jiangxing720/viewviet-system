import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

const LANGUAGES = [
  {
    code: "vi",
    flag: "🇻🇳",
    nameKey: "learn.lang_vi",
    descKey: "learn.lang_vi_desc",
    color: "from-red-50 to-yellow-50 dark:from-red-950/20 dark:to-yellow-950/20",
    border: "border-red-200 dark:border-red-800/40",
  },
  {
    code: "en",
    flag: "🇬🇧",
    nameKey: "learn.lang_en",
    descKey: "learn.lang_en_desc",
    color: "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
    border: "border-blue-200 dark:border-blue-800/40",
  },
  {
    code: "zh",
    flag: "🇨🇳",
    nameKey: "learn.lang_zh",
    descKey: "learn.lang_zh_desc",
    color: "from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20",
    border: "border-rose-200 dark:border-rose-800/40",
  },
  {
    code: "ko",
    flag: "🇰🇷",
    nameKey: "learn.lang_ko",
    descKey: "learn.lang_ko_desc",
    color: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
    border: "border-violet-200 dark:border-violet-800/40",
  },
];

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
      <path
        d="M700 0 C680 120 560 180 480 320 C400 460 460 580 360 680 C260 780 80 800 0 900 L700 900 Z"
        fill="rgba(13,115,119,0.18)"
      />
      <path
        d="M0 0 C80 60 200 40 280 160 C360 280 280 420 360 520 C440 620 620 580 700 700 L700 0 Z"
        fill="rgba(13,115,119,0.12)"
      />
      <circle cx="580" cy="480" r="140" fill="rgba(13,115,119,0.14)" />
      <circle cx="160" cy="280" r="90" fill="rgba(13,115,119,0.10)" />
    </svg>
  );
}

export default function LearnHub() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Left panel: Language selection ── */}
      <div className="w-full md:w-2/5 flex flex-col justify-center px-8 py-12 md:px-12 md:py-16 bg-background">
        <div className="max-w-sm mx-auto md:mx-0 w-full space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t("learn.title")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("learn.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((lang) => (
              <Link key={lang.code} href={`/learn/${lang.code}/words`}>
                <div
                  className={`group relative rounded-2xl border bg-gradient-to-br ${lang.color} ${lang.border} p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]`}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-3xl leading-none">{lang.flag}</span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{t(lang.nameKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {t(lang.descKey)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-left">
            {t("learn.pick_hint", { defaultValue: "选择一门语言，开始你的学习之旅" })}
          </p>
        </div>
      </div>

      {/* ── Right panel: Dark teal with organic shapes ── */}
      <div
        className="hidden md:flex md:w-3/5 relative overflow-hidden flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(145deg, #071a1a 0%, #0c2424 45%, #061414 100%)",
        }}
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
