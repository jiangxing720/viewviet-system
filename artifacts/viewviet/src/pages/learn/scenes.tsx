import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSceneSentences, getGetSceneSentencesQueryKey, useGetSceneNames, getGetSceneNamesQueryKey } from "@workspace/api-client-react";
import { Volume2, MessageSquare, Mic } from "lucide-react";
import { useTtsVoice } from "@/hooks/useTtsVoice";

import { getLangConfig, getLangFlag, useLangConfig } from "@/lib/lang-utils";
// Language label badge styles
const TRANSLATION_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  zh: { label: "中", bg: "#fef2f2", text: "#b91c1c" },
  en: { label: "EN", bg: "#eff6ff", text: "#1d4ed8" },
  vi: { label: "VI", bg: "#fefce8", text: "#92400e" },
};

function TranslationRow({ lang, content }: { lang: string; content: string }) {
  const badge = TRANSLATION_BADGES[lang];
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded min-w-[28px] text-center mt-0.5"
        style={{ background: badge.bg, color: badge.text }}
      >
        {badge.label}
      </span>
      <p className="leading-snug text-foreground">{content}</p>
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
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name === "online-high-quality" ? "在线高清原音 (极速推荐)" : v.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function KtvText({
  sentence,
  lang,
  makeUtterance,
}: {
  sentence: string;
  lang: string;
  makeUtterance: (text: string) => SpeechSynthesisUtterance;
}) {
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
    const u = makeUtterance(sentence);
    setSpeaking(true);
    setActiveChar(-1);

    u.onboundary = (ev) => {
      if (ev.name === "word" || ev.name === "sentence") {
        const charIdx = ev.charIndex;
        const segIdx = positions.findIndex(
          (p) => !p.isSpace && p.start <= charIdx && charIdx < p.end,
        );
        setActiveChar(segIdx >= 0 ? segIdx : charIdx);
      }
    };
    u.onend = () => { setSpeaking(false); setActiveChar(-1); };
    u.onerror = () => { setSpeaking(false); setActiveChar(-1); };
    window.speechSynthesis.speak(u);
  }, [sentence, makeUtterance, positions]);

  return (
    <button
      className="w-full text-left group cursor-pointer"
      onClick={startKtv}
      title="点击朗读"
      type="button"
    >
      <div className="flex items-start gap-2">
        <Volume2
          className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${
            speaking ? "text-primary animate-pulse" : "text-muted-foreground group-hover:text-primary"
          }`}
        />
        <p className="text-base font-medium leading-relaxed flex flex-wrap gap-x-0.5">
          {segments.map((seg, i) => {
            const isSpace = /^\s+$/.test(seg);
            if (isSpace) return <span key={i}>{seg}</span>;
            return (
              <span
                key={i}
                className={`transition-colors duration-100 ${
                  activeChar === i ? "text-primary font-bold" : ""
                }`}
              >
                {seg}
              </span>
            );
          })}
        </p>
      </div>
    </button>
  );
}

export default function SceneSentences() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const config = useLangConfig(lang);
  const [scene, setScene] = useState<string | undefined>();

  const { makeUtterance } = useTtsVoice(lang);

  const { data: scenes } = useGetSceneNames(
    { language_code: lang },
    { query: { queryKey: getGetSceneNamesQueryKey({ language_code: lang }) } },
  );
  const { data: sentencesResp, isLoading } = useGetSceneSentences(
    { language_code: lang, scene_name: scene, limit: 50 },
    { query: { queryKey: getGetSceneSentencesQueryKey({ language_code: lang, scene_name: scene ?? undefined, limit: 50 }) } },
  );

  const sentences = (sentencesResp as any)?.data ?? [];
  const sceneList = (scenes as any[]) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href={`/learn/${lang}/words`}>
          <Button variant="ghost" size="sm">{t("learn.back_words")}</Button>
        </Link>
        <span className="text-2xl">{getLangFlag(lang)}</span>
        <h1 className="text-xl md:text-2xl font-bold flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          {config ? config.label : lang.toUpperCase()} {t("learn.scene_sentences")}
        </h1>
        <Link href={`/learn/${lang}/complex`} className="ml-auto">
          <Button variant="outline" size="sm">{t("learn.complex_btn")}</Button>
        </Link>
      </div>

      {/* Voice selector */}
      <div className="mb-4">
        <VoiceSelector lang={lang} />
      </div>

      {/* Scene tabs */}
      <div className="overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <div className="flex gap-2 w-max md:flex-wrap md:w-auto">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              !scene ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
            onClick={() => setScene(undefined)}
          >
            {t("learn.all_scenes")}
          </button>
          {sceneList.map((s: string) => (
            <button
              key={s}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                scene === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setScene(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("learn.no_scenes")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sentences.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-3.5 space-y-2.5">
                {/* Main sentence with KTV highlight */}
                <KtvText sentence={s.sentence} lang={lang} makeUtterance={makeUtterance} />

                {/* Pronunciation */}
                {s.pronunciation && (
                  <p className="text-xs text-muted-foreground font-mono pl-6">{s.pronunciation}</p>
                )}

                {/* Translations — each labeled with a colored badge */}
                {(s.translationZh || s.translationEn || s.translationVi) && (
                  <div className="border-l-2 border-muted pl-3 space-y-1.5">
                    {s.translationZh && <TranslationRow lang="zh" content={s.translationZh} />}
                    {s.translationEn && <TranslationRow lang="en" content={s.translationEn} />}
                    {s.translationVi && <TranslationRow lang="vi" content={s.translationVi} />}
                  </div>
                )}

                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  {s.sceneName && <Badge variant="outline" className="text-xs">{s.sceneName}</Badge>}
                  {s.difficulty && (
                    <Badge variant="secondary" className="text-xs">
                      {t("learn.level", { n: s.difficulty })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
