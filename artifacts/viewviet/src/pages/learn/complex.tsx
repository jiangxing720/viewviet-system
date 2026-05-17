import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetComplexSentences, getGetComplexSentencesQueryKey } from "@workspace/api-client-react";
import { Volume2, Brain, Mic } from "lucide-react";
import { useTtsVoice } from "@/hooks/useTtsVoice";

import { getLangConfig, getLangFlag, useLangConfig } from "@/lib/lang-utils";
const DIFFICULTIES = [1, 2, 3, 4, 5];

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
          <option key={v.name} value={v.name}>{v.name}</option>
        ))}
      </select>
    </div>
  );
}

function KtvText({
  sentence,
  makeUtterance,
}: {
  sentence: string;
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
    const utter = makeUtterance(sentence);
    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word") setActiveChar(e.charIndex);
    };
    utter.onstart = () => { setSpeaking(true); setActiveChar(0); };
    utter.onend = () => { setSpeaking(false); setActiveChar(-1); };
    utter.onerror = () => { setSpeaking(false); setActiveChar(-1); };
    window.speechSynthesis.speak(utter);
  }, [sentence, makeUtterance]);

  return (
    <div
      className="flex items-start gap-2 cursor-pointer group"
      onClick={startKtv}
      title="点击朗读"
    >
      <div className={`flex-1 flex flex-wrap gap-x-0.5 leading-relaxed text-base font-semibold ${speaking ? "text-foreground" : "group-hover:text-primary/90"} transition-colors`}>
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
      <div
        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all mt-0.5 ${
          speaking ? "bg-accent text-accent-foreground animate-pulse" : "text-muted-foreground/50 group-hover:text-primary group-hover:bg-primary/10"
        }`}
      >
        <Volume2 className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

export default function ComplexSentences() {
  const { lang = "vi" } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const config = useLangConfig(lang);
  const [difficulty, setDifficulty] = useState<number | undefined>();

  const { makeUtterance } = useTtsVoice(lang);

  const { data: sentencesResp, isLoading } = useGetComplexSentences(
    { language_code: lang, difficulty, limit: 50 },
    { query: { queryKey: getGetComplexSentencesQueryKey({ language_code: lang, difficulty, limit: 50 }) } },
  );

  const sentences = (sentencesResp as any)?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href={`/learn/${lang}/scenes`}>
          <Button variant="ghost" size="sm">{t("learn.back_scenes")}</Button>
        </Link>
        <span className="text-2xl">{getLangFlag(lang)}</span>
        <h1 className="text-xl md:text-2xl font-bold">{config ? config.label : lang.toUpperCase()} {t("learn.complex_sentences")}</h1>
      </div>

      {/* Voice selector */}
      <div className="mb-4">
        <VoiceSelector lang={lang} />
      </div>

      <div className="overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <div className="flex gap-2 w-max md:flex-wrap md:w-auto items-center">
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t("learn.filter_difficulty")}</span>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${!difficulty ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setDifficulty(undefined)}
          >
            {t("learn.all")}
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${difficulty === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => setDifficulty(d)}
            >
              {t("learn.level", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("learn.no_complex")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sentences.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <KtvText sentence={s.sentence} makeUtterance={makeUtterance} />
                  </div>
                  {s.difficulty && <Badge variant="secondary" className="text-xs flex-shrink-0 mt-0.5">{t("learn.level", { n: s.difficulty })}</Badge>}
                </div>
                {s.pronunciation && <p className="text-xs text-muted-foreground font-mono">{s.pronunciation}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm">
                  {s.translationZh && <p className="leading-snug"><span className="text-muted-foreground text-xs">中：</span>{s.translationZh}</p>}
                  {s.translationEn && <p className="leading-snug"><span className="text-muted-foreground text-xs">EN：</span>{s.translationEn}</p>}
                  {s.translationVi && <p className="leading-snug"><span className="text-muted-foreground text-xs">VI：</span>{s.translationVi}</p>}
                </div>
                {s.grammarNotes && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-primary mb-1">{t("learn.grammar_notes")}</p>
                    <p className="text-sm leading-snug">{s.grammarNotes}</p>
                  </div>
                )}
                {s.context && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("learn.context")}:</span>
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
