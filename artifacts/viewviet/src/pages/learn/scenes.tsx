import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSceneSentences, getGetSceneSentencesQueryKey, useGetSceneNames, getGetSceneNamesQueryKey } from "@workspace/api-client-react";
import { Volume2, MessageSquare } from "lucide-react";

const LANG_NAMES: Record<string, string> = { vi: "Vietnamese", en: "English", zh: "Chinese", ko: "Korean" };
const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷" };

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  const langMap: Record<string, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ko: "ko-KR" };
  utter.lang = langMap[lang] ?? "en-US";
  window.speechSynthesis.speak(utter);
}

export default function SceneSentences() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const [scene, setScene] = useState<string | undefined>();

  const { data: scenes } = useGetSceneNames(
    { language_code: lang },
    { query: { queryKey: getGetSceneNamesQueryKey({ language_code: lang }) } },
  );
  const { data: sentencesResp, isLoading } = useGetSceneSentences(
    { language_code: lang, scene_name: scene, limit: 50 },
    { query: { queryKey: getGetSceneSentencesQueryKey({ language_code: lang, scene_name: scene, limit: 50 }) } },
  );

  const sentences = (sentencesResp as any)?.data ?? [];
  const sceneList = (scenes as any[]) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={`/learn/${lang}/words`}>
          <Button variant="ghost" size="sm" data-testid="button-back-words">← Words</Button>
        </Link>
        <span className="text-2xl">{LANG_FLAGS[lang]}</span>
        <h1 className="text-2xl font-bold">{LANG_NAMES[lang]} Scene Sentences</h1>
        <Link href={`/learn/${lang}/complex`} className="ml-auto">
          <Button variant="outline" size="sm" data-testid="link-complex">Complex Sentences</Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!scene ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          onClick={() => setScene(undefined)}
          data-testid="tab-scene-all"
        >
          All Scenes
        </button>
        {sceneList.map((s: string) => (
          <button
            key={s}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${scene === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setScene(s)}
            data-testid={`tab-scene-${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No sentences found for this scene yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentences.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all duration-200" data-testid={`card-sentence-${s.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-lg leading-snug">{s.sentence}</p>
                    {s.pronunciation && <p className="text-sm text-muted-foreground font-mono">{s.pronunciation}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-1">
                      {s.translationZh && <p><span className="text-muted-foreground text-xs">中文：</span>{s.translationZh}</p>}
                      {s.translationEn && <p><span className="text-muted-foreground text-xs">EN：</span>{s.translationEn}</p>}
                      {s.translationVi && <p><span className="text-muted-foreground text-xs">VI：</span>{s.translationVi}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => speak(s.sentence, lang)} data-testid={`button-tts-${s.id}`}>
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    {s.sceneName && <Badge variant="outline" className="text-xs">{s.sceneName}</Badge>}
                    {s.difficulty && <Badge variant="secondary" className="text-xs">Level {s.difficulty}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
