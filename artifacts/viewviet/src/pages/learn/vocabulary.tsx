import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetWords, getGetWordsQueryKey, useGetWordCategories, getGetWordCategoriesQueryKey } from "@workspace/api-client-react";
import { Search, Volume2, BookOpen, Star } from "lucide-react";

const LANG_NAMES: Record<string, string> = { vi: "Vietnamese", en: "English", zh: "Chinese", ko: "Korean" };
const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷" };

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  const langMap: Record<string, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ko: "ko-KR" };
  utter.lang = langMap[lang] ?? "en-US";
  window.speechSynthesis.speak(utter);
}

function DifficultyStars({ level }: { level?: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= (level ?? 0) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function Vocabulary() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/learn">
          <Button variant="ghost" size="sm" data-testid="button-back-learn">← Languages</Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{LANG_FLAGS[lang]}</span>
          <h1 className="text-2xl font-bold">{LANG_NAMES[lang]} Vocabulary</h1>
        </div>
        <div className="flex gap-2 ml-auto">
          <Link href={`/learn/${lang}/scenes`}>
            <Button variant="outline" size="sm" data-testid="link-scenes">Scenes</Button>
          </Link>
          <Link href={`/learn/${lang}/complex`}>
            <Button variant="outline" size="sm" data-testid="link-complex">Complex</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
              onClick={() => { setCategory(undefined); setPage(1); }}
              data-testid="filter-category-all"
            >
              All Words
            </button>
            {catList.map((cat) => (
              <button
                key={cat}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                onClick={() => { setCategory(cat); setPage(1); }}
                data-testid={`filter-category-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search words..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              data-testid="input-search-words"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No words found. Try a different category or search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {words.map((word: any) => (
                <Card key={word.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1" data-testid={`card-word-${word.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xl font-bold">{word.word}</p>
                        {word.pronunciation && <p className="text-sm text-muted-foreground font-mono">{word.pronunciation}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 flex-shrink-0"
                        onClick={() => speak(word.word, lang)}
                        data-testid={`button-tts-${word.id}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm">
                      {word.meaningZh && <p><span className="text-muted-foreground">中文：</span>{word.meaningZh}</p>}
                      {word.meaningEn && <p><span className="text-muted-foreground">EN：</span>{word.meaningEn}</p>}
                      {word.meaningVi && <p><span className="text-muted-foreground">VI：</span>{word.meaningVi}</p>}
                    </div>
                    {word.exampleSentence && (
                      <div className="bg-muted/50 rounded-lg p-2 text-xs">
                        <p className="italic">{word.exampleSentence}</p>
                        {word.exampleTranslation && <p className="text-muted-foreground mt-0.5">{word.exampleTranslation}</p>}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
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
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">Next</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
