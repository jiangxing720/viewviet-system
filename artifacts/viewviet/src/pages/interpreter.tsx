import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Trash2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useInterpreter, type LangCode, type Exchange, type InterpreterStatus } from "@/hooks/use-interpreter";

const LANGUAGES: { code: LangCode; native: string }[] = [
  { code: "zh", native: "中文" },
  { code: "vi", native: "Tiếng Việt" },
  { code: "en", native: "English" },
  { code: "ko", native: "한국어" },
];

function StatusIndicator({ status }: { status: InterpreterStatus }) {
  const { t } = useTranslation();
  const icon = {
    listening: <Mic className="w-3.5 h-3.5 text-green-500 animate-pulse" />,
    translating: <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />,
    speaking: <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />,
    idle: <MicOff className="w-3.5 h-3.5 text-muted-foreground" />,
  }[status];
  const label = t(`interpreter.${status}`);
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}{label}
    </span>
  );
}

function LangSelect({
  value,
  other,
  disabled,
  onChange,
}: {
  value: LangCode;
  other: LangCode;
  disabled: boolean;
  onChange: (l: LangCode) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LangCode)}
      className="border rounded-xl px-3 py-2 text-sm bg-background font-semibold focus:ring-2 focus:ring-primary/30 disabled:opacity-60 cursor-pointer"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} disabled={l.code === other}>
          {l.native}
        </option>
      ))}
    </select>
  );
}

function ExchangeCard({
  exchange,
  onReplay,
}: {
  exchange: Exchange;
  onReplay: () => void;
}) {
  const isA = exchange.speaker === "A";
  return (
    <div
      className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl text-sm border max-w-[88%] ${
        isA
          ? "bg-primary/10 border-primary/20 self-end"
          : "bg-muted border-border self-start"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant={isA ? "default" : "secondary"}
          className="text-[10px] px-1.5 py-0"
        >
          {exchange.speaker}
        </Badge>
        <button
          onClick={onReplay}
          className="text-muted-foreground hover:text-primary transition-colors rounded p-0.5"
          title="Replay"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{exchange.original}</p>
      <div className="flex items-center gap-1 text-muted-foreground/50">
        <ArrowRight className="w-3 h-3 flex-shrink-0" />
      </div>
      <p className="font-medium leading-snug">{exchange.translated}</p>
    </div>
  );
}

export default function InterpreterPage() {
  const { t } = useTranslation();
  const [langA, setLangA] = useState<LangCode>("zh");
  const [langB, setLangB] = useState<LangCode>("vi");
  const { running, status, log, start, stop, replay, clearLog, supported } =
    useInterpreter(langA, langB);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const sameLang = langA === langB;
  const canStart = supported && !sameLang;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden select-none">

      {/* ── Person A panel — rotated 180° for face-to-face ── */}
      <div className="rotate-180 flex-shrink-0 bg-primary/5 border-b px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-primary text-base w-5 text-center">A</span>
          <LangSelect value={langA} other={langB} disabled={running} onChange={setLangA} />
          <span className="text-sm text-muted-foreground font-medium">{t("interpreter.person_a")}</span>
          {running && <span className="ml-auto"><StatusIndicator status={status} /></span>}
        </div>
      </div>

      {/* ── Conversation log ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Mic className="w-10 h-10 opacity-20" />
            <p className="text-sm">{t("interpreter.no_log")}</p>
          </div>
        ) : (
          <>
            {log.map((ex) => (
              <ExchangeCard key={ex.id} exchange={ex} onReplay={() => replay(ex)} />
            ))}
            <div ref={logEndRef} />
          </>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="flex-shrink-0 border-y bg-background/90 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="w-28">
          <StatusIndicator status={status} />
        </div>

        {!supported ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{t("interpreter.not_supported")}</span>
          </div>
        ) : sameLang ? (
          <p className="text-xs text-amber-500 text-center font-medium">
            {t("interpreter.same_lang_warn")}
          </p>
        ) : (
          <Button
            size="lg"
            className={`px-10 font-bold rounded-full text-base transition-all ${
              running
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
            onClick={running ? stop : start}
            disabled={!canStart}
          >
            {running ? t("interpreter.stop") : t("interpreter.start")}
          </Button>
        )}

        <div className="w-28 flex justify-end">
          {log.length > 0 && !running && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLog}
              className="text-muted-foreground hover:text-destructive gap-1 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("interpreter.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Person B panel — normal orientation ── */}
      <div className="flex-shrink-0 bg-primary/5 border-t px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-primary text-base w-5 text-center">B</span>
          <LangSelect value={langB} other={langA} disabled={running} onChange={setLangB} />
          <span className="text-sm text-muted-foreground font-medium">{t("interpreter.person_b")}</span>
          {running && <span className="ml-auto"><StatusIndicator status={status} /></span>}
        </div>
      </div>
    </div>
  );
}
