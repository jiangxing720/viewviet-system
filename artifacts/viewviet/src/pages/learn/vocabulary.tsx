import { useState } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useGetWords, getGetWordsQueryKey, useGetWordCategories, getGetWordCategoriesQueryKey } from "@workspace/api-client-react";
import { Search, Volume2, BookOpen, Star, SlidersHorizontal, Mic } from "lucide-react";
import { useTtsVoice } from "@/hooks/useTtsVoice";

const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷" };
const LANG_NAME_KEYS: Record<string, string> = { vi: "learn.lang_vi", en: "learn.lang_en", zh: "learn.lang_zh", ko: "learn.lang_ko" };

function DifficultyStars({ level }: { level?: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= (level ?? 0) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function VoiceSelector({ lang }: { lang: string }) {
  const { voices, selectedVoiceName, selectVoice } = useTtsVoice(lang);
  if (voices.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Mic className="w-3 h-3 flex-shrink-0" />
      <select
        className="text-xs border rounded px-2 py-1 bg-background text-foreground max-w-[180px] truncate"
        value={selectedVoiceName}
        onChange={(e) => selectVoice(e.target.value)}
        title="选择朗读音色"
      >
        <option value="">默认音色</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CategoryList({
  catList,
  category,
  onSelect,
  t,
}: {
  catList: string[];
  category: string | undefined;
  onSelect: (c: string | undefined) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-1">
      <button
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
        onClick={() => onSelect(undefined)}
      >
        {t("learn.all_words")}
      </button>
      {catList.map((cat) => (
        <button
          key={cat}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default function Vocabulary() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { speak } = useTtsVoice(lang);

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
    setCategory(c);
    setPage(1);
    setSheetOpen(false);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href="/learn">
          <Button variant="ghost" size="sm">{t("learn.back_lang")}</Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{LANG_FLAGS[lang]}</span>
          <h1 className="text-xl md:text-2xl font-bold">{t(LANG_NAME_KEYS[lang] ?? "learn.vocabulary")} {t("learn.vocabulary")}</h1>
        </div>
        <div className="flex gap-2 ml-auto">
          <Link href={`/learn/${lang}/scenes`}>
            <Button variant="outline" size="sm">{t("learn.scenes_btn")}</Button>
          </Link>
          <Link href={`/learn/${lang}/complex`}>
            <Button variant="outline" size="sm">{t("learn.complex_btn")}</Button>
          </Link>
        </div>
      </div>

      {/* Voice selector row */}
      <div className="mb-4">
        <VoiceSelector lang={lang} />
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("learn.categories")}</p>
            <CategoryList catList={catList} category={category} onSelect={handleCategorySelect} t={t} />
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search + mobile filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("learn.search_placeholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden flex-shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>{t("learn.categories")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <CategoryList catList={catList} category={category} onSelect={handleCategorySelect} t={t} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {category && (
            <div className="flex md:hidden">
              <Badge variant="secondary" className="gap-1">
                {category}
                <button onClick={() => { setCategory(undefined); setPage(1); }} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold truncate">{word.word}</p>
                          <button
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => speak(word.word)}
                            title={t("learn.tts_play")}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {word.pronunciation && <p className="text-xs text-muted-foreground font-mono mt-0.5">{word.pronunciation}</p>}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-sm">
                      {word.meaningZh && <p className="leading-snug"><span className="text-muted-foreground text-xs">中：</span>{word.meaningZh}</p>}
                      {word.meaningEn && <p className="leading-snug"><span className="text-muted-foreground text-xs">EN：</span>{word.meaningEn}</p>}
                      {word.meaningVi && <p className="leading-snug"><span className="text-muted-foreground text-xs">VI：</span>{word.meaningVi}</p>}
                    </div>

                    {word.exampleSentence && (
                      <button
                        className="w-full text-left bg-muted/50 rounded-lg p-2.5 space-y-1 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-colors cursor-pointer"
                        onClick={() => speak(word.exampleSentence)}
                        title={t("learn.tts_play")}
                      >
                        <div className="flex items-start gap-1.5">
                          <Volume2 className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary/60" />
                          <p className="italic text-sm leading-snug flex-1">{word.exampleSentence}</p>
                        </div>
                        {word.exampleTranslation && (
                          <p className="text-xs text-muted-foreground pl-4.5">{word.exampleTranslation}</p>
                        )}
                      </button>
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
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("common.previous")}</Button>
              <span className="text-sm text-muted-foreground">
                {t("common.page_of", { page, total: pagination.totalPages })}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>{t("common.next")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
