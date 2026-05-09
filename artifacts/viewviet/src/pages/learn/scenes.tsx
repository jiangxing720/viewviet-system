import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSceneSentences, getGetSceneSentencesQueryKey, useGetSceneNames, getGetSceneNamesQueryKey } from "@workspace/api-client-react";
import { Volume2, MessageSquare } from "lucide-react";

const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ko: "🇰🇷" };
const LANG_NAME_KEYS: Record<string, string> = { vi: "learn.lang_vi", en: "learn.lang_en", zh: "learn.lang_zh", ko: "learn.lang_ko" };
const LANG_MAP: Record<string, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ko: "ko-KR" };

function KtvText({ sentence, lang }: { sentence: string; lang: string }) {
  const [activeChar, setActiveChar] = useState(-1);
  const [speaking, setSpeaking] = useState(false);

  const isCJK = /[\u4e00-\u9fff\u3040-\u30ff]/.test(sentence);
  const segments = isCJK ? sentence.split("") : sentence.split(/(\s+)/);

  let pos = 0;
  const positions: Array<{ start: number; end: number; isSpace: boolean }> = [];
  for (const seg of segments) {
    const isSpace = /^\s+$/.test(seg);
    positions.push({ start: pos, end: pos + seg.length, isSpace });
    pos += seg.length;
  }

  const startKtv = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(sentence);
    utter.lang = LANG_MAP[lang] ?? "en-US";
    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word") setActiveChar(e.charIndex);
    };
    utter.onstart = () => { setSpeaking(true); setActiveChar(0); };
    utter.onend = () => { setSpeaking(false); setActiveChar(-1); };
    utter.onerror = () => { setSpeaking(false); setActiveChar(-1); };
    window.speechSynthesis.speak(utter);
  }, [sentence, lang]);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 flex flex-wrap leading-relaxed text-lg font-semibold">
        {segments.map((seg, i) => {
          const { start, end, isSpace } = positions[i];
          const isActive = speaking && activeChar >= start && activeChar < end && !isSpace;
          return (
            <span
              key={i}
              className={`transition-all duration-75 ${isActive ? "bg-accent text-accent-foreground rounded px-0.5 scale-110 inline-block" : ""}`}
            >
              {seg}
            </span>
          );
        })}
      </div>
      <button
        onClick={startKtv}
        title="Play"
        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all ${
          speaking ? "bg-accent text-accent-foreground animate-pulse" : "hover:bg-muted text-muted-foreground hover:text-primary"
        }`}
      >
        <Volume2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SceneSentences() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const { t } = useTranslation();
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
          <Button variant="ghost" size="sm">{t("learn.back_words")}</Button>
        </Link>
        <span className="text-2xl">{LANG_FLAGS[lang]}</span>
        <h1 className="text-xl md:text-2xl font-bold">{t(LANG_NAME_KEYS[lang] ?? "learn.scene_sentences")} {t("learn.scene_sentences")}</h1>
        <Link href={`/learn/${lang}/complex`} className="ml-auto">
          <Button variant="outline" size="sm">{t("learn.complex_btn")}</Button>
        </Link>
      </div>

      {/* Scene tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto pb-2 mb-8 -mx-4 px-4">
        <div className="flex gap-2 w-max md:flex-wrap md:w-auto">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${!scene ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setScene(undefined)}
          >
            {t("learn.all_scenes")}
          </button>
          {sceneList.map((s: string) => (
            <button
              key={s}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${scene === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => setScene(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("learn.no_scenes")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentences.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-5">
                <KtvText sentence={s.sentence} lang={lang} />
                {s.pronunciation && <p className="text-sm text-muted-foreground font-mono mt-2">{s.pronunciation}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-3">
                  {s.translationZh && <p><span className="text-muted-foreground text-xs">中文：</span>{s.translationZh}</p>}
                  {s.translationEn && <p><span className="text-muted-foreground text-xs">EN：</span>{s.translationEn}</p>}
                  {s.translationVi && <p><span className="text-muted-foreground text-xs">VI：</span>{s.translationVi}</p>}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {s.sceneName && <Badge variant="outline" className="text-xs">{s.sceneName}</Badge>}
                  {s.difficulty && <Badge variant="secondary" className="text-xs">{t("learn.level", { n: s.difficulty })}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
