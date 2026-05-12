import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Volume2, Trash2, AlertCircle, Loader2,
  ArrowRight, FileText, ChevronLeft, Hand,
} from "lucide-react";
import {
  useInterpreter,
  type LangCode, type Exchange, type PendingExchange, type InterpreterStatus, type DirectionMode,
} from "@/hooks/use-interpreter";

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

/** Large push-to-talk hold button */
function PttButton({ onStart, onEnd, status, isListening }: {
  onStart: () => void; onEnd: () => void;
  status: InterpreterStatus; isListening: boolean;
}) {
  const { t } = useTranslation();
  const busy = status === "translating" || status === "speaking";

  return (
    <button
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onStart(); }}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      disabled={busy}
      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1.5 font-bold text-xs shadow-xl transition-all duration-150 touch-none select-none
        ${isListening
          ? "bg-green-500 text-white scale-110 shadow-green-300"
          : busy
            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            : "bg-primary text-primary-foreground active:scale-95"
        }`}
    >
      {busy
        ? <Loader2 className="w-7 h-7 animate-spin" />
        : <Mic className={`w-7 h-7 ${isListening ? "animate-pulse" : ""}`} />
      }
      <span className="text-[10px] leading-tight text-center px-1">
        {isListening ? t("interpreter.release_to_send") : busy ? "..." : t("interpreter.hold_to_speak")}
      </span>
    </button>
  );
}

function PersonPanel({
  speaker, lang, otherLang, disabled, onChangeLang, label,
  running, status, activeSpeaker, interim,
  exchanges, pendings, onReplayExchange,
  pushToTalk, isPttSpeaker, onPttStart, onPttEnd,
}: {
  speaker: "A" | "B"; lang: LangCode; otherLang: LangCode;
  disabled: boolean; onChangeLang: (l: LangCode) => void; label: string;
  running: boolean; status: InterpreterStatus; activeSpeaker: "A" | "B";
  interim: string;
  exchanges: Exchange[];
  pendings: PendingExchange[];
  onReplayExchange: (e: Exchange) => void;
  pushToTalk: boolean; isPttSpeaker: boolean;
  onPttStart: () => void; onPttEnd: () => void;
}) {
  const { t } = useTranslation();
  const isActive = activeSpeaker === speaker;
  const isListening = isActive && status === "listening";
  const showInterim = !!interim;
  const inPttSpeakerMode = running && pushToTalk && isPttSpeaker;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [exchanges.length, pendings.length, showInterim, interim]);

  return (
    <div className="flex-1 flex flex-col min-h-0 px-3 pt-2.5 pb-2 gap-1.5">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LangSelect value={lang} other={otherLang} disabled={disabled} onChange={onChangeLang} />
        <span className="text-xs text-muted-foreground font-medium flex-1">{label}</span>
        {running && !pushToTalk && isActive && (
          status === "listening" ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" /> :
          status === "translating" ? <Loader2 className="w-3 h-3 text-amber-500 animate-spin flex-shrink-0" /> :
          null
        )}
      </div>

      {/* Scrollable bilingual history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-0.5"
      >
        {exchanges.length === 0 && !showInterim && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/40 text-center px-4">
              {t("interpreter.no_log")}
            </p>
          </div>
        )}

        {exchanges.map((ex) => {
          const isFromA = ex.speaker === "A";
          return (
            <div
              key={ex.id}
              className={`rounded-xl px-3 py-2 border flex-shrink-0 ${
                isFromA
                  ? "bg-primary/8 border-primary/15"
                  : "bg-muted/60 border-border/50"
              }`}
            >
              {/* Speaker badge + replay */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isFromA ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                  {ex.speaker}
                </span>
                <button
                  onClick={() => onReplayExchange(ex)}
                  className="text-muted-foreground/50 hover:text-primary transition-colors p-0.5"
                  title={t("interpreter.replay")}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Original */}
              <p className="text-sm font-medium text-foreground leading-snug">
                {ex.original}
              </p>
              {/* Translation */}
              <p className="text-sm text-primary/80 leading-snug mt-1 border-t border-border/30 pt-1">
                {ex.translated}
              </p>
            </div>
          );
        })}

        {/* Pending cards — original text shown immediately while translation runs */}
        {pendings.map((p) => {
          const isFromA = p.speaker === "A";
          return (
            <div
              key={p.id}
              className={`rounded-xl px-3 py-2 border flex-shrink-0 opacity-80 ${
                isFromA ? "bg-primary/8 border-primary/15" : "bg-muted/60 border-border/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isFromA ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>{p.speaker}</span>
                <Loader2 className="w-3 h-3 text-muted-foreground/50 animate-spin" />
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{p.original}</p>
              <p className="text-[11px] text-muted-foreground/50 leading-snug mt-1 border-t border-border/30 pt-1 italic">
                {t("interpreter.translating")}…
              </p>
            </div>
          );
        })}

        {/* Interim: live caption on both panels simultaneously */}
        {showInterim && (
          <div className={`rounded-xl px-3 py-2 border flex-shrink-0 ${
            isActive
              ? "bg-green-500/8 border-green-500/20"   // speaking panel — green tint
              : "bg-primary/5 border-primary/15"        // receiving panel — neutral tint
          }`}>
            {!isActive && (
              <span className="text-[10px] font-bold text-primary/50 uppercase tracking-wide block mb-0.5">
                {activeSpeaker}
              </span>
            )}
            <p className="text-sm text-muted-foreground italic leading-snug">{interim}</p>
          </div>
        )}
      </div>

      {/* PTT button pinned at bottom */}
      {inPttSpeakerMode && (
        <div className="flex-shrink-0 flex justify-center py-1">
          <PttButton
            onStart={onPttStart}
            onEnd={onPttEnd}
            status={status}
            isListening={isListening}
          />
        </div>
      )}
    </div>
  );
}

/** Review panel shown after session ends */
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

      <div className="flex-shrink-0 border-t px-4 py-3 bg-background/95 backdrop-blur flex gap-2">
        <Button className="flex-1 gap-2 font-semibold" onClick={handleSummary} disabled={summarizing}>
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

function isSpeakerInDirection(speaker: "A" | "B", dir: DirectionMode): boolean {
  if (dir === "both") return true;
  if (dir === "a-to-b") return speaker === "A";
  return speaker === "B";
}

export default function InterpreterPage() {
  const { t } = useTranslation();
  const [langA, setLangA] = useState<LangCode>("zh");
  const [langB, setLangB] = useState<LangCode>("vi");
  const [direction, setDirection] = useState<DirectionMode>("both");
  const [pushToTalk, setPushToTalk] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"split" | "same">("split");
  const [reviewing, setReviewing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, start, stop, startFor, stopListening, replay, clearLog, supported,
  } = useInterpreter(langA, langB, direction, pushToTalk);

  useEffect(() => {
    if (!running && log.length > 0) setReviewing(true);
  }, [running, log.length]);

  // Keep a ref so the log-change effect always sees the latest autoSpeak value
  const autoSpeakRef = useRef(autoSpeak);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  // Auto-speak: play the translation of every new exchange when enabled
  const prevLogLenRef = useRef(0);
  useEffect(() => {
    if (autoSpeakRef.current && log.length > prevLogLenRef.current) {
      const latest = log[log.length - 1];
      if (latest) replay(latest);
    }
    prevLogLenRef.current = log.length;
  }, [log.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sameLang = langA === langB;
  const canStart = supported && !sameLang;


  const DIRECTIONS: { value: DirectionMode; label: string }[] = [
    { value: "both", label: t("interpreter.direction_both") },
    { value: "a-to-b", label: "A→B" },
    { value: "b-to-a", label: "B→A" },
  ];

  if (reviewing && log.length > 0) {
    return (
      <ReviewPanel
        log={log} langA={langA} langB={langB}
        onBack={() => setReviewing(false)}
        onReplay={replay}
        onClear={() => { clearLog(); setReviewing(false); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden select-none bg-background">

      {/* Person A panel — rotated 180° in split mode, normal in same-direction mode */}
      <div className={`${layoutMode === "split" ? "rotate-180" : ""} flex-1 flex flex-col min-h-0 border-b bg-primary/5`}>
        <PersonPanel
          speaker="A" lang={langA} otherLang={langB}
          disabled={running} onChangeLang={setLangA}
          label={t("interpreter.person_a")}
          running={running} status={status} activeSpeaker={activeSpeaker}
          interim={interim}
          exchanges={log}
          pendings={pendings}
          onReplayExchange={replay}
          pushToTalk={pushToTalk}
          isPttSpeaker={isSpeakerInDirection("A", direction)}
          onPttStart={() => startFor("A")}
          onPttEnd={stopListening}
        />
      </div>

      {/* Control strip */}
      <div className="flex-shrink-0 border-y bg-background/95 backdrop-blur z-10">
        {/* Settings row — hidden while session is running */}
        {!running && (
          <div className="px-3 pt-2 pb-1 flex items-center gap-2 flex-wrap">
            {/* Direction pills */}
            <div className="flex gap-1">
              {DIRECTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDirection(value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    direction === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {/* Layout toggle */}
            <button
              onClick={() => setLayoutMode((m) => m === "split" ? "same" : "split")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                layoutMode === "same"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {layoutMode === "split" ? t("interpreter.layout_split") : t("interpreter.layout_same")}
            </button>
            {/* PTT toggle */}
            <button
              onClick={() => setPushToTalk((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                pushToTalk
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hand className="w-3 h-3" />
              {t("interpreter.push_to_talk")}
            </button>
            {/* Auto-speak toggle */}
            <button
              onClick={() => setAutoSpeak((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                autoSpeak
                  ? "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Volume2 className="w-3 h-3" />
              {t("interpreter.auto_speak")}
            </button>
          </div>
        )}

        {/* Main action row */}
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          {/* Left: status indicator */}
          <div className="w-8 flex items-center">
            {status === "listening" ? <Mic className="w-4 h-4 text-green-500 animate-pulse" /> :
             status === "translating" ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> :
             status === "speaking" ? <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" /> :
             <MicOff className="w-4 h-4 text-muted-foreground/40" />}
          </div>

          {/* Center: error / start-stop */}
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
          ) : running && pushToTalk ? (
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-[11px] text-muted-foreground text-center">
                {status === "translating" ? t("interpreter.translating") :
                 status === "speaking" ? t("interpreter.speaking") :
                 t("interpreter.ptt_hint")}
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="px-6 font-bold rounded-full"
                onClick={stop}
              >
                {t("interpreter.stop")}
              </Button>
            </div>
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

          {/* Right: history icon */}
          <div className="w-8 flex justify-end">
            {log.length > 0 && !running && (
              <button onClick={() => setReviewing(true)} className="text-muted-foreground/60 hover:text-primary transition-colors p-1 rounded" title={t("interpreter.history")}>
                <FileText className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Person B panel — normal */}
      <div className="flex-1 flex flex-col min-h-0 bg-primary/5">
        <PersonPanel
          speaker="B" lang={langB} otherLang={langA}
          disabled={running} onChangeLang={setLangB}
          label={t("interpreter.person_b")}
          running={running} status={status} activeSpeaker={activeSpeaker}
          interim={interim}
          exchanges={log}
          pendings={pendings}
          onReplayExchange={replay}
          pushToTalk={pushToTalk}
          isPttSpeaker={isSpeakerInDirection("B", direction)}
          onPttStart={() => startFor("B")}
          onPttEnd={stopListening}
        />
      </div>
    </div>
  );
}
