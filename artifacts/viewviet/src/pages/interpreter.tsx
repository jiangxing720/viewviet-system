import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Trash2, AlertCircle, Loader2, ArrowRight, FileText, ChevronLeft } from "lucide-react";
import { useInterpreter, type LangCode, type Exchange, type InterpreterStatus } from "@/hooks/use-interpreter";

const LANGUAGES: { code: LangCode; native: string; full: string }[] = [
  { code: "zh", native: "中文", full: "Chinese" },
  { code: "vi", native: "Tiếng Việt", full: "Vietnamese" },
  { code: "en", native: "English", full: "English" },
  { code: "ko", native: "한국어", full: "Korean" },
];

function LangSelect({ value, other, disabled, onChange }: {
  value: LangCode; other: LangCode; disabled: boolean; onChange: (l: LangCode) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LangCode)}
      className="border rounded-xl px-2 py-1.5 text-sm bg-background font-semibold focus:ring-2 focus:ring-primary/30 disabled:opacity-60 cursor-pointer"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} disabled={l.code === other}>{l.native}</option>
      ))}
    </select>
  );
}

function StatusDot({ status, active }: { status: InterpreterStatus; active: boolean }) {
  if (!active) return null;
  if (status === "listening") return <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />;
  if (status === "translating") return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin flex-shrink-0" />;
  if (status === "speaking") return <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse flex-shrink-0" />;
  return null;
}

function PersonPanel({
  speaker, lang, otherLang, disabled, onChangeLang, label,
  running, status, activeSpeaker, interim, lastReceived, onReplay,
}: {
  speaker: "A" | "B"; lang: LangCode; otherLang: LangCode;
  disabled: boolean; onChangeLang: (l: LangCode) => void; label: string;
  running: boolean; status: InterpreterStatus; activeSpeaker: "A" | "B";
  interim: string; lastReceived: Exchange | undefined; onReplay: () => void;
}) {
  const { t } = useTranslation();
  const isActive = activeSpeaker === speaker;
  const showInterim = isActive && !!interim;
  const showTranslation = !showInterim && !!lastReceived;

  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-2 gap-2">
      <div className="flex items-center gap-2 flex-shrink-0">
        <LangSelect value={lang} other={otherLang} disabled={disabled} onChange={onChangeLang} />
        <span className="text-sm text-muted-foreground font-medium flex-1">{label}</span>
        {running && <StatusDot status={status} active={isActive} />}
        {showTranslation && (
          <button onClick={onReplay} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title={t("interpreter.replay")}>
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        {showInterim ? (
          <p className="text-xl font-medium text-center leading-relaxed text-muted-foreground italic px-2 line-clamp-5">{interim}</p>
        ) : showTranslation ? (
          <p className="text-2xl font-bold text-center leading-relaxed text-foreground px-2 line-clamp-5">{lastReceived!.translated}</p>
        ) : running && isActive && status === "listening" ? (
          <p className="text-sm text-muted-foreground/60 text-center">{t("interpreter.listening")}</p>
        ) : (
          <p className="text-sm text-muted-foreground/40 text-center">{t("interpreter.no_log")}</p>
        )}
      </div>
    </div>
  );
}

/** Review view shown after session ends — full scrollable history + AI summary */
function ReviewPanel({
  log, langA, langB, onBack, onReplay, onClear,
}: {
  log: Exchange[]; langA: LangCode; langB: LangCode;
  onBack: () => void; onReplay: (e: Exchange) => void; onClear: () => void;
}) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const langAFull = LANGUAGES.find((l) => l.code === langA)?.full ?? langA;
  const langBFull = LANGUAGES.find((l) => l.code === langB)?.full ?? langB;

  async function handleSummary() {
    setSummarizing(true);
    setSummaryError(false);
    setSummary("");
    try {
      const res = await fetch("/api/interpreter/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchanges: log, langA: langAFull, langB: langBFull }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { summary?: string };
      setSummary(data.summary ?? "");
    } catch {
      setSummaryError(true);
    } finally {
      setSummarizing(false);
    }
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [summary]);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-2.5 flex items-center gap-3 bg-background/95 backdrop-blur">
        <button onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm flex-1">{t("interpreter.history")}</span>
        <span className="text-xs text-muted-foreground">{log.length} {t("interpreter.exchanges")}</span>
        <button onClick={onClear} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded" title={t("interpreter.clear")}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {log.map((ex) => {
          const isA = ex.speaker === "A";
          return (
            <div key={ex.id} className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl text-sm border max-w-[90%] ${isA ? "bg-primary/10 border-primary/20 self-end" : "bg-muted border-border self-start"}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isA ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {ex.speaker}
                </span>
                <button onClick={() => onReplay(ex)} className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded" title={t("interpreter.replay")}>
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{ex.original}</p>
              <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
              <p className="font-medium leading-snug">{ex.translated}</p>
            </div>
          );
        })}

        {/* Summary block */}
        {summary && (
          <div className="mt-2 px-3 py-3 rounded-2xl border border-primary/20 bg-primary/5 text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
        )}
        {summaryError && (
          <p className="text-xs text-destructive text-center mt-1">{t("interpreter.summary_error")}</p>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Summary action */}
      <div className="flex-shrink-0 border-t px-4 py-3 bg-background/95 backdrop-blur flex gap-2">
        <Button
          className="flex-1 gap-2 font-semibold"
          onClick={handleSummary}
          disabled={summarizing}
        >
          {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {summarizing ? t("interpreter.summarizing") : t("interpreter.summarize")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onBack}>
          <Mic className="w-4 h-4" />
          {t("interpreter.new_session")}
        </Button>
      </div>
    </div>
  );
}

export default function InterpreterPage() {
  const { t } = useTranslation();
  const [langA, setLangA] = useState<LangCode>("zh");
  const [langB, setLangB] = useState<LangCode>("vi");
  const [reviewing, setReviewing] = useState(false);

  const {
    running, status, log, interim, activeSpeaker,
    permissionError, start, stop, replay, clearLog, supported,
  } = useInterpreter(langA, langB);

  // Auto-enter review mode when session stops and there's content
  useEffect(() => {
    if (!running && log.length > 0) setReviewing(true);
  }, [running, log.length]);

  const sameLang = langA === langB;
  const canStart = supported && !sameLang;

  const lastForA = [...log].reverse().find((e) => e.speaker === "B");
  const lastForB = [...log].reverse().find((e) => e.speaker === "A");

  if (reviewing && log.length > 0) {
    return (
      <ReviewPanel
        log={log}
        langA={langA}
        langB={langB}
        onBack={() => setReviewing(false)}
        onReplay={replay}
        onClear={() => { clearLog(); setReviewing(false); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden select-none bg-background">

      {/* Person A — rotated 180° */}
      <div className="rotate-180 flex-1 flex flex-col min-h-0 border-b bg-primary/5">
        <PersonPanel
          speaker="A" lang={langA} otherLang={langB}
          disabled={running} onChangeLang={setLangA}
          label={t("interpreter.person_a")}
          running={running} status={status} activeSpeaker={activeSpeaker}
          interim={interim} lastReceived={lastForA}
          onReplay={() => lastForA && replay(lastForA)}
        />
      </div>

      {/* Control strip */}
      <div className="flex-shrink-0 border-y bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between gap-2 z-10">
        <div className="w-8 flex items-center">
          {status === "listening" ? <Mic className="w-4 h-4 text-green-500 animate-pulse" /> :
           status === "translating" ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> :
           status === "speaking" ? <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" /> :
           <MicOff className="w-4 h-4 text-muted-foreground/40" />}
        </div>

        {!supported ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium flex-1 justify-center">
            <AlertCircle className="w-4 h-4" />{t("interpreter.not_supported")}
          </div>
        ) : permissionError ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium flex-1 justify-center">
            <AlertCircle className="w-4 h-4" />{t("interpreter.mic_denied")}
          </div>
        ) : sameLang ? (
          <p className="text-xs text-amber-500 text-center font-medium flex-1">{t("interpreter.same_lang_warn")}</p>
        ) : (
          <Button
            size="sm"
            className={`px-8 font-bold rounded-full transition-all ${running ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
            onClick={running ? stop : start}
            disabled={!canStart}
          >
            {running ? t("interpreter.stop") : t("interpreter.start")}
          </Button>
        )}

        <div className="w-8 flex justify-end">
          {log.length > 0 && !running && (
            <button onClick={() => setReviewing(true)} className="text-muted-foreground/60 hover:text-primary transition-colors p-1 rounded" title={t("interpreter.history")}>
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Person B — normal */}
      <div className="flex-1 flex flex-col min-h-0 bg-primary/5">
        <PersonPanel
          speaker="B" lang={langB} otherLang={langA}
          disabled={running} onChangeLang={setLangB}
          label={t("interpreter.person_b")}
          running={running} status={status} activeSpeaker={activeSpeaker}
          interim={interim} lastReceived={lastForB}
          onReplay={() => lastForB && replay(lastForB)}
        />
      </div>
    </div>
  );
}
