import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useGetWords, getGetWordsQueryKey, useGetWordCategories, getGetWordCategoriesQueryKey } from "@workspace/api-client-react";
import { Search, Volume2, BookOpen, Star, Mic, ChevronUp } from "lucide-react";
import { useTtsVoice } from "@/hooks/useTtsVoice";
import { getLangFlag, useLangConfig } from "@/lib/lang-utils";
import { LanguageSwitcher } from "@/components/learn/LanguageSwitcher";

/* ── Lang → BCP-47 for meaning TTS ───────────────────────── */
const LANG_BCP47: Record<string, string> = {
  zh: "zh-CN", en: "en-US", vi: "vi-VN",
  ko: "ko-KR", ja: "ja-JP", th: "th-TH",
  fr: "fr-FR", de: "de-DE", es: "es-ES", ru: "ru-RU",
};

function speakInLang(text: string, langCode: string) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_BCP47[langCode] ?? langCode;
  u.rate = 0.92;
  const all = window.speechSynthesis.getVoices();
  const prefix = u.lang.slice(0, 2).toLowerCase();
  const best = all.find(v => v.lang.toLowerCase().startsWith(prefix) && v.localService)
    ?? all.find(v => v.lang.toLowerCase().startsWith(prefix));
  if (best) u.voice = best;
  window.speechSynthesis.speak(u);
}

/* ── Difficulty stars ─────────────────────────────────────── */
function DifficultyStars({ level }: { level?: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= (level ?? 0) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

/* ── Voice selector ───────────────────────────────────────── */
function VoiceSelector({ lang }: { lang: string }) {
  const { voiceOptions, selectedVoiceName, selectVoice } = useTtsVoice(lang);
  if (voiceOptions.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Mic className="w-3 h-3 flex-shrink-0" />
      <select
        className="text-xs border rounded px-2 py-1 bg-background text-foreground max-w-[220px] truncate"
        value={selectedVoiceName}
        onChange={(e) => selectVoice(e.target.value)}
        title="选择朗读音色"
      >
        {voiceOptions.map((v) => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Small speak button (EN / VI meanings only) ───────────── */
function SpeakBtn({ text, langCode }: { text: string; langCode: string }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      title={`朗读（${langCode}）`}
      onClick={e => {
        e.stopPropagation();
        setActive(true);
        speakInLang(text, langCode);
        setTimeout(() => setActive(false), 1500);
      }}
      className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
        active ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-muted"
      }`}
    >
      <Volume2 className={`w-3 h-3 ${active ? "animate-pulse" : ""}`} />
    </button>
  );
}

/* ── Category chip strip ───────────────────────────────────── */
function CategoryChips({
  catList, category, onSelect, t,
}: {
  catList: string[];
  category: string | undefined;
  onSelect: (c: string | undefined) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" style={{ scrollbarWidth: "none" }}>
      <button
        onClick={() => onSelect(undefined)}
        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
          !category
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
        }`}
      >
        {t("learn.all_words")}
      </button>
      {catList.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(category === cat ? undefined : cat)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
            category === cat
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

/* ── Example sentence with KTV highlight ─────────────────── */
function KtvSentence({
  text, speak, makeUtterance,
}: {
  text: string;
  speak: (t: string) => void;
  makeUtterance: (t: string) => SpeechSynthesisUtterance;
}) {
  const [activeChar, setActiveChar] = useState(-1);
  const [speaking, setSpeaking] = useState(false);

  const isCJK = /[\u4e00-\u9fff\u3040-\u30ff]/.test(text);
  const segments = isCJK ? text.split("") : text.split(/(\s+)/);
  let pos = 0;
  const positions: Array<{ start: number; end: number; isSpace: boolean }> = [];
  for (const seg of segments) {
    positions.push({ start: pos, end: pos + seg.length, isSpace: /^\s+$/.test(seg) });
    pos += seg.length;
  }

  const startKtv = useCallback(() => {
    speak(text);
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = makeUtterance(text);
    setSpeaking(true); setActiveChar(-1);
    u.onboundary = (ev) => {
      if (ev.name === "word" || ev.name === "sentence") {
        const idx = positions.findIndex(p => !p.isSpace && p.start <= ev.charIndex && ev.charIndex < p.end);
        setActiveChar(idx >= 0 ? idx : ev.charIndex);
      }
    };
    u.onend = () => { setSpeaking(false); setActiveChar(-1); };
    u.onerror = () => { setSpeaking(false); setActiveChar(-1); };
    window.speechSynthesis.speak(u);
  }, [text, speak, makeUtterance, positions]);

  return (
    <button className="w-full text-left group cursor-pointer" onClick={startKtv} title="点击朗读" type="button">
      <div className="flex items-start gap-2">
        <Volume2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors ${
          speaking ? "text-primary animate-pulse" : "text-muted-foreground group-hover:text-primary"
        }`} />
        <p className="text-sm font-medium leading-snug flex flex-wrap gap-x-0.5">
          {segments.map((seg, i) => {
            if (/^\s+$/.test(seg)) return <span key={i}>{seg}</span>;
            return (
              <span key={i} className={`transition-colors duration-100 ${activeChar === i ? "text-primary" : ""}`}>
                {seg}
              </span>
            );
          })}
        </p>
      </div>
    </button>
  );
}

/* ── Scroll-to-top button ────────────────────────────────── */
function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="返回顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full shadow-lg border border-border/60 bg-background/90 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-200"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.85)",
        transition: "opacity 0.25s ease, transform 0.25s ease, background-color 0.15s, color 0.15s",
      }}
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function Vocabulary() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const config = useLangConfig(lang);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");

  const { speak, makeUtterance } = useTtsVoice(lang);

  const { data: wordsResp, isLoading } = useGetWords(
    { language_code: lang, category, search: search || undefined, page, limit: 20 },
    { query: { queryKey: getGetWordsQueryKey({ language_code: lang, category, search: search || undefined, page, limit: 20 }) } },
  );
  const { data: categories } = useGetWordCategories(
    { language_code: lang },
    { query: { queryKey: getGetWordCategoriesQueryKey({ language_code: lang }) } },
  );

  const words = (wordsResp as any)?.data ?? [];
  const pagination = (wordsResp as any)?.pagination;
  const catList = (categories as any[]) ?? [];

  function handleCategorySelect(c: string | undefined) {
    setCategory(c); setPage(1);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href="/learn">
          <Button variant="ghost" size="sm">{t("learn.back_lang", "返回")}</Button>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLang={lang} />
          <h1 className="text-xl md:text-2xl font-bold ml-1">{config ? config.label : lang.toUpperCase()} {t("learn.vocabulary", "词汇")}</h1>
        </div>
        <div className="flex gap-2 ml-auto overflow-x-auto pb-1">
          <Link href={`/learn/${lang}/pronunciation`}>
            <Button variant="outline" size="sm" className="whitespace-nowrap">发音</Button>
          </Link>
          <Link href={`/learn/${lang}/words`}>
            <Button variant="default" size="sm" className="whitespace-nowrap">{t("learn.vocabulary", "词汇")}</Button>
          </Link>
          <Link href={`/learn/${lang}/scenes`}>
            <Button variant="outline" size="sm" className="whitespace-nowrap">{t("learn.scenes_btn", "情景")}</Button>
          </Link>
          <Link href={`/learn/${lang}/complex`}>
            <Button variant="outline" size="sm" className="whitespace-nowrap">{t("learn.complex_btn", "长难句")}</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4"><VoiceSelector lang={lang} /></div>

      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("learn.search_placeholder")}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Category chip strip */}
        {catList.length > 0 && (
          <CategoryChips catList={catList} category={category} onSelect={handleCategorySelect} t={t} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("learn.no_words")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {words.map((word: any) => (
                <Card key={word.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-4 space-y-2.5">

                    {/* ── Word: plain bold + speak button ── */}
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => speak(word.word)}
                        title="朗读"
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors mt-0.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-bold leading-snug break-all">{word.word}</p>
                        {word.pronunciation && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{word.pronunciation}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Meanings: 中文 text only, EN+VI with speak ── */}
                    <div className="space-y-1 text-sm border-l-2 border-muted pl-2.5">
                      {word.meaningZh && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex-shrink-0 text-xs font-bold px-1 py-0.5 rounded min-w-[24px] text-center" style={{ background: "#fef2f2", color: "#b91c1c" }}>中</span>
                          <p className="leading-snug flex-1">{word.meaningZh}</p>
                          {/* 中文朗读已移除 */}
                        </div>
                      )}
                      {word.meaningEn && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex-shrink-0 text-xs font-bold px-1 py-0.5 rounded min-w-[24px] text-center" style={{ background: "#eff6ff", color: "#1d4ed8" }}>EN</span>
                          <p className="leading-snug flex-1">{word.meaningEn}</p>
                          <SpeakBtn text={word.meaningEn} langCode="en" />
                        </div>
                      )}
                      {word.meaningVi && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex-shrink-0 text-xs font-bold px-1 py-0.5 rounded min-w-[24px] text-center" style={{ background: "#fefce8", color: "#92400e" }}>VI</span>
                          <p className="leading-snug flex-1">{word.meaningVi}</p>
                          <SpeakBtn text={word.meaningVi} langCode="vi" />
                        </div>
                      )}
                    </div>

                    {/* ── Example sentence: KTV only ── */}
                    {word.exampleSentence && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-2.5 space-y-1">
                        <KtvSentence text={word.exampleSentence} speak={speak} makeUtterance={makeUtterance} />
                        {word.exampleTranslation && (
                          <p className="text-xs text-muted-foreground pl-5">{word.exampleTranslation}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      <DifficultyStars level={word.difficulty} />
                      {word.category && <Badge variant="secondary" className="text-xs">{word.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("common.previous")}</Button>
              <span className="text-sm text-muted-foreground">
                {t("common.page_of", { page, total: pagination.totalPages })}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>{t("common.next")}</Button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">跳转</span>
                <input
                  type="number" min={1} max={pagination.totalPages}
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const n = Math.min(pagination.totalPages, Math.max(1, Number(jumpPage)));
                      if (!isNaN(n)) { setPage(n); setJumpPage(""); }
                    }
                  }}
                  placeholder="页码"
                  className="w-16 h-8 text-sm border rounded-md px-2 bg-background text-center"
                />
                <Button size="sm" variant="outline" className="h-8 px-2 text-xs"
                  onClick={() => {
                    const n = Math.min(pagination.totalPages, Math.max(1, Number(jumpPage)));
                    if (!isNaN(n) && jumpPage !== "") { setPage(n); setJumpPage(""); }
                  }}
                >GO</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to top */}
      <ScrollToTopBtn />
    </div>
  );
}
