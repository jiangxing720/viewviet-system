import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useInterpreter, type LangCode, type Exchange, type InterpreterStatus } from "@/hooks/use-interpreter";

const LANGUAGES: { code: LangCode; native: string }[] = [
  { code: "zh", native: "中文" },
  { code: "vi", native: "Tiếng Việt" },
  { code: "en", native: "English" },
  { code: "ko", native: "한국어" },
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

/** One half of the split screen */
function PersonPanel({
  speaker,
  lang,
  otherLang,
  disabled,
  onChangeLang,
  label,
  running,
  status,
  activeSpeaker,
  interim,
  lastReceived,       // last exchange where THIS person is the receiver
  onReplay,
}: {
  speaker: "A" | "B";
  lang: LangCode;
  otherLang: LangCode;
  disabled: boolean;
  onChangeLang: (l: LangCode) => void;
  label: string;
  running: boolean;
  status: InterpreterStatus;
  activeSpeaker: "A" | "B";
  interim: string;
  lastReceived: Exchange | undefined;
  onReplay: () => void;
}) {
  const { t } = useTranslation();
  const isActive = activeSpeaker === speaker;
  const isSpeaking = isActive && status === "listening";

  // What this panel shows:
  // - If this person is actively speaking → their interim text
  // - Otherwise → the translation they received (from the other speaker)
  const showInterim = isActive && !!interim;
  const showTranslation = !showInterim && !!lastReceived;

  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-2 gap-2">
      {/* Header: lang selector + name + active indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LangSelect value={lang} other={otherLang} disabled={disabled} onChange={onChangeLang} />
        <span className="text-sm text-muted-foreground font-medium flex-1">{label}</span>
        {running && <StatusDot status={status} active={isActive} />}
        {showTranslation && (
          <button
            onClick={onReplay}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
            title={t("interpreter.replay")}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main content: translation or live caption, no scrolling */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {showInterim ? (
          /* Live caption — what THIS person is saying right now */
          <p className="text-xl font-medium text-center leading-relaxed text-muted-foreground italic px-2 line-clamp-5">
            {interim}
          </p>
        ) : showTranslation ? (
          /* Translation received from the other speaker */
          <p className="text-2xl font-bold text-center leading-relaxed text-foreground px-2 line-clamp-5">
            {lastReceived!.translated}
          </p>
        ) : running && isSpeaking ? (
          <p className="text-sm text-muted-foreground/60 text-center">{t("interpreter.listening")}</p>
        ) : running ? (
          <p className="text-sm text-muted-foreground/40 text-center">{t("interpreter.idle")}</p>
        ) : (
          <p className="text-sm text-muted-foreground/40 text-center">{t("interpreter.no_log")}</p>
        )}
      </div>
    </div>
  );
}

export default function InterpreterPage() {
  const { t } = useTranslation();
  const [langA, setLangA] = useState<LangCode>("zh");
  const [langB, setLangB] = useState<LangCode>("vi");

  const {
    running, status, log, interim, activeSpeaker,
    permissionError, start, stop, replay, clearLog, supported,
  } = useInterpreter(langA, langB);

  const sameLang = langA === langB;
  const canStart = supported && !sameLang;

  // Last exchange where A is the RECEIVER (B spoke → A gets translation)
  const lastForA = [...log].reverse().find((e) => e.speaker === "B");
  // Last exchange where B is the RECEIVER (A spoke → B gets translation)
  const lastForB = [...log].reverse().find((e) => e.speaker === "A");

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden select-none bg-background">

      {/* ── Person A — rotated so they can read facing the device ── */}
      <div className="rotate-180 flex-1 flex flex-col min-h-0 border-b bg-primary/5">
        <PersonPanel
          speaker="A"
          lang={langA}
          otherLang={langB}
          disabled={running}
          onChangeLang={setLangA}
          label={t("interpreter.person_a")}
          running={running}
          status={status}
          activeSpeaker={activeSpeaker}
          interim={interim}
          lastReceived={lastForA}
          onReplay={() => lastForA && replay(lastForA)}
        />
      </div>

      {/* ── Control strip ── */}
      <div className="flex-shrink-0 border-y bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between gap-2 z-10">

        {/* Left: status icon */}
        <div className="w-8 flex items-center">
          {status === "listening" ? <Mic className="w-4 h-4 text-green-500 animate-pulse" /> :
           status === "translating" ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> :
           status === "speaking" ? <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" /> :
           <MicOff className="w-4 h-4 text-muted-foreground/40" />}
        </div>

        {/* Center: main action */}
        {!supported ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium flex-1 justify-center">
            <AlertCircle className="w-4 h-4" />
            {t("interpreter.not_supported")}
          </div>
        ) : permissionError ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium flex-1 justify-center">
            <AlertCircle className="w-4 h-4" />
            {t("interpreter.mic_denied")}
          </div>
        ) : sameLang ? (
          <p className="text-xs text-amber-500 text-center font-medium flex-1">
            {t("interpreter.same_lang_warn")}
          </p>
        ) : (
          <Button
            size="sm"
            className={`px-8 font-bold rounded-full transition-all ${
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

        {/* Right: clear */}
        <div className="w-8 flex justify-end">
          {log.length > 0 && !running && (
            <button
              onClick={clearLog}
              className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded"
              title={t("interpreter.clear")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Person B — normal orientation ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-primary/5">
        <PersonPanel
          speaker="B"
          lang={langB}
          otherLang={langA}
          disabled={running}
          onChangeLang={setLangB}
          label={t("interpreter.person_b")}
          running={running}
          status={status}
          activeSpeaker={activeSpeaker}
          interim={interim}
          lastReceived={lastForB}
          onReplay={() => lastForB && replay(lastForB)}
        />
      </div>
    </div>
  );
}
