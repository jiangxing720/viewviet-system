import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetComplexSentences, getGetComplexSentencesQueryKey } from "@workspace/api-client-react";
import { Volume2, Brain } from "lucide-react";

const LANG_NAMES: Record<string, string> = { vi: "Vietnamese", en: "English", zh: "Chinese", ko: "Korean" };
const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷" };

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  const langMap: Record<string, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ko: "ko-KR" };
  utter.lang = langMap[lang] ?? "en-US";
  window.speechSynthesis.speak(utter);
}

const DIFFICULTIES = [1, 2, 3, 4, 5];

export default function ComplexSentences() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const [difficulty, setDifficulty] = useState<number | undefined>();

  const { data: sentencesResp, isLoading } = useGetComplexSentences(
    { language_code: lang, difficulty, limit: 50 },
    { query: { queryKey: getGetComplexSentencesQueryKey({ language_code: lang, difficulty, limit: 50 }) } },
  );

  const sentences = (sentencesResp as any)?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={`/learn/${lang}/scenes`}>
          <Button variant="ghost" size="sm" data-testid="button-back-scenes">← Scenes</Button>
        </Link>
        <span className="text-2xl">{LANG_FLAGS[lang]}</span>
        <h1 className="text-2xl font-bold">{LANG_NAMES[lang]} Complex Sentences</h1>
      </div>

      <div className="flex gap-2 flex-wrap mb-8 items-center">
        <span className="text-sm text-muted-foreground">Filter by difficulty:</span>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!difficulty ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          onClick={() => setDifficulty(undefined)}
          data-testid="filter-difficulty-all"
        >
          All
        </button>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${difficulty === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setDifficulty(d)}
            data-testid={`filter-difficulty-${d}`}
          >
            Level {d}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No complex sentences found at this difficulty level.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sentences.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all duration-200" data-testid={`card-complex-${s.id}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-lg leading-snug">{s.sentence}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => speak(s.sentence, lang)} data-testid={`button-tts-${s.id}`}>
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    {s.difficulty && <Badge variant="secondary" className="text-xs">Level {s.difficulty}</Badge>}
                  </div>
                </div>
                {s.pronunciation && <p className="text-sm text-muted-foreground font-mono">{s.pronunciation}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  {s.translationZh && <p><span className="text-muted-foreground text-xs">中文：</span>{s.translationZh}</p>}
                  {s.translationEn && <p><span className="text-muted-foreground text-xs">EN：</span>{s.translationEn}</p>}
                  {s.translationVi && <p><span className="text-muted-foreground text-xs">VI：</span>{s.translationVi}</p>}
                </div>
                {s.grammarNotes && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary mb-1">Grammar Notes</p>
                    <p className="text-sm">{s.grammarNotes}</p>
                  </div>
                )}
                {s.context && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Context:</span>
                    <Badge variant="outline" className="text-xs">{s.context}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
