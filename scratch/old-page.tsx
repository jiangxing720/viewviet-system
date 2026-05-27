import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Trash2, ArrowRight, X, Maximize2, Minimize2, Check, ExternalLink, RotateCw, Monitor
} from "lucide-react";
import { useInterpreter, type LangCode } from "@/hooks/use-interpreter";
import { cn } from "@/lib/utils";

const LANGUAGES: { code: LangCode; native: string; full: string }[] = [
  { code: "zh", native: "中文", full: "Chinese" },
  { code: "vi", native: "Tiếng Việt", full: "Vietnamese" },
  { code: "en", native: "English", full: "English" },
  { code: "ko", native: "한국어", full: "Korean" },
];

function LangSelect({ value, other, disabled, onChange, dark }: {
  value: LangCode; other: LangCode; disabled: boolean; onChange: (l: LangCode) => void; dark?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LangCode)}
      className={cn(
        "border rounded-xl px-4 py-2 text-lg font-bold focus:ring-4 focus:outline-none appearance-none cursor-pointer text-center min-w-[120px] transition-all",
        dark 
          ? "bg-slate-800 border-slate-700 text-white focus:ring-primary/50" 
          : "bg-white border-white/20 text-slate-900 focus:ring-primary/30 shadow-sm"
      )}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} disabled={l.code === other}>
          {l.native}
        </option>
      ))}
    </select>
  );
}

export default function Interpreter() {
  const { t } = useTranslation();
  const {
    status,
    langA,
    langB,
    setLangA,
    setLangB,
    exchanges,
    pendingA,
    pendingB,
    errorMsg,
    startListening,
    stopListening,
    clearHistory
  } = useInterpreter("zh", "vi");

  const [flipped, setFlipped] = useState(false);
  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (scrollRefA.current) scrollRefA.current.scrollTop = scrollRefA.current.scrollHeight;
    if (scrollRefB.current) scrollRefB.current.scrollTop = scrollRefB.current.scrollHeight;
  }, [exchanges, pendingA, pendingB]);

  const handlePointerDown = (speaker: "A" | "B") => {
    startListening(speaker);
  };

  const handlePointerUp = () => {
    // Optionally stop listening on pointer up, or keep continuous. 
    // We will keep continuous for 1-2 seconds after, but since SpeechRecognition is continuous,
    // we can just stop it to force the "onend" event or let it auto-stop when silence.
    // For Tap-To-Speak it's better to let them just tap once, it listens until silence.
    // So we don't call stopListening() here to allow natural pauses.
  };

  const renderSide = (speaker: "A" | "B") => {
    const isA = speaker === "A";
    const isActive = status === (isA ? "listening-a" : "listening-b");
    const pendingText = isA ? pendingA : pendingB;
    const currentLang = isA ? langA : langB;
    const otherLang = isA ? langB : langA;
    const setLang = isA ? setLangA : setLangB;
    
    // Side A is usually light/reddish, Side B is dark/yellowish
    const bgClass = isA ? "bg-slate-50" : "bg-slate-900";
    const textClass = isA ? "text-slate-900" : "text-white";
    const activeRing = isA ? "ring-red-500/40" : "ring-amber-500/40";
    const pulseBg = isA ? "bg-red-500" : "bg-amber-500";

    const myExchanges = exchanges.filter(e => e.speaker === speaker || e.targetLang === currentLang);

    return (
      <div 
        className={cn(
          "relative flex flex-col flex-1 h-full w-full overflow-hidden transition-colors duration-500",
          bgClass, textClass,
          isActive && `ring-inset ring-[12px] ${activeRing}`
        )}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/5 to-transparent">
          <LangSelect 
            value={currentLang} 
            other={otherLang} 
            disabled={status !== "idle" && status !== "error"}
            onChange={setLang}
            dark={!isA}
          />
          {isA && (
            <div className="flex gap-2">
               <Button variant="ghost" size="icon" onClick={() => setFlipped(!flipped)} title="Flip Side B" className={isA ? "text-slate-600" : "text-slate-300"}>
                 <RotateCw className="w-5 h-5" />
               </Button>
               <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear" className={isA ? "text-slate-600" : "text-slate-300"}>
                 <Trash2 className="w-5 h-5" />
               </Button>
            </div>
          )}
        </div>

        {/* Chat History & Pending */}
        <div ref={isA ? scrollRefA : scrollRefB} className="flex-1 overflow-y-auto px-6 pt-24 pb-32 flex flex-col gap-6">
          {myExchanges.map((ex, i) => (
            <div key={i} className={cn("flex flex-col max-w-[85%]", ex.speaker === speaker ? "self-end items-end" : "self-start items-start")}>
              <span className={cn("text-xs font-semibold mb-1 opacity-50", !isA && "text-slate-400")}>
                {ex.speaker === speaker ? "Me" : LANGUAGES.find(l=>l.code===otherLang)?.native}
              </span>
              <div className={cn(
                "px-5 py-4 rounded-3xl text-xl md:text-2xl font-medium shadow-sm leading-relaxed",
                ex.speaker === speaker 
                  ? (isA ? "bg-white text-slate-900" : "bg-slate-800 text-white")
                  : (isA ? "bg-slate-200 text-slate-800" : "bg-slate-700 text-white")
              )}>
                {ex.speaker === speaker ? ex.original : ex.translated}
              </div>
            </div>
          ))}
          
          {/* Pending Text */}
          {pendingText && (
            <div className="flex flex-col max-w-[85%] self-end items-end animate-in fade-in slide-in-from-bottom-2">
               <span className={cn("text-xs font-semibold mb-1 opacity-50", !isA && "text-slate-400")}>Listening...</span>
               <div className={cn(
                  "px-5 py-4 rounded-3xl text-xl md:text-2xl font-medium shadow-sm leading-relaxed border-2 border-dashed",
                  isA ? "border-slate-300 bg-white" : "border-slate-600 bg-slate-800 text-white"
               )}>
                  {pendingText}
               </div>
            </div>
          )}
        </div>

        {/* Giant Mic Button */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex justify-center bg-gradient-to-t from-black/20 to-transparent">
          <button
            onPointerDown={(e) => { e.preventDefault(); handlePointerDown(speaker); }}
            onPointerUp={(e) => { e.preventDefault(); handlePointerUp(); }}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "group relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl transition-all select-none touch-none",
              isActive ? pulseBg : (isA ? "bg-white" : "bg-slate-800"),
              isActive ? "scale-110" : "hover:scale-105 active:scale-95"
            )}
          >
            {isActive && (
              <span className={cn("absolute inset-0 rounded-full animate-ping opacity-75", pulseBg)} />
            )}
            <Mic className={cn(
              "w-10 h-10 md:w-14 md:h-14 transition-colors z-10",
              isActive ? "text-white" : (isA ? "text-slate-400" : "text-slate-500")
            )} />
            {!isActive && (
              <span className={cn("absolute -top-10 text-sm font-bold whitespace-nowrap opacity-50 uppercase tracking-widest", isA ? "text-slate-600" : "text-slate-400")}>
                Tap to speak
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col md:flex-row overflow-hidden font-sans touch-none select-none">
      
      {/* ERROR OVERLAY */}
      {errorMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
          <button onClick={() => window.location.reload()} className="ml-2 bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs uppercase">Reload</button>
        </div>
      )}
      
      {/* Side B (Top on mobile, Right on desktop) */}
      <div className={cn(
        "flex-1 h-1/2 md:h-full w-full md:w-1/2 order-1 md:order-2 transition-transform duration-500 origin-center",
        flipped && "rotate-180 md:rotate-0" // only flip on mobile
      )}>
        {renderSide("B")}
      </div>

      {/* Side A (Bottom on mobile, Left on desktop) */}
      <div className="flex-1 h-1/2 md:h-full w-full md:w-1/2 order-2 md:order-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[10px_0_40px_rgba(0,0,0,0.1)] z-20">
        {renderSide("A")}
      </div>

      {/* Center Divider / Processing Indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <div className={cn(
          "w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          status === "processing" ? "bg-primary scale-110" : "bg-white scale-100 border-4 border-slate-100"
        )}>
          {status === "processing" ? (
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-white animate-spin" />
          ) : (
            <Monitor className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
          )}
        </div>
      </div>

    </div>
  );
}
