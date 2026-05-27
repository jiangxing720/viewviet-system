import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Trash2, RotateCw, Monitor, AlertCircle, FileText, Loader2, StopCircle
} from "lucide-react";
import { useInterpreter, type LangCode } from "@/hooks/use-interpreter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  
  const [langA, setLangA] = useState<LangCode>("zh");
  const [langB, setLangB] = useState<LangCode>("vi");

  const {
    running, status, log, pendings, interim, activeSpeaker,
    permissionError, start, stop, clearLog
  } = useInterpreter(langA, langB, "both", false, false);

  const [flipped, setFlipped] = useState(false);
  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Auto scroll
  useEffect(() => {
    if (scrollRefA.current) scrollRefA.current.scrollTop = scrollRefA.current.scrollHeight;
    if (scrollRefB.current) scrollRefB.current.scrollTop = scrollRefB.current.scrollHeight;
  }, [log, pendings, interim]);

  const handleGenerateSummary = async () => {
    if (log.length === 0) {
      toast.error(t("No conversation to summarize"));
      return;
    }
    setIsSummarizing(true);
    try {
      const res = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? ""}/api/interpreter/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchanges: log, langA, langB })
      });
      if (res.ok) {
        const data = await res.json();
        // Just show it in an alert or push it to log as a system message
        toast.success(t("Summary generated! Check console or alert for now."));
        alert(data.summary);
      } else {
        toast.error(t("Failed to generate summary"));
      }
    } catch (e) {
      toast.error(t("Network error"));
    } finally {
      setIsSummarizing(false);
    }
  };

  const renderSide = (speaker: "A" | "B") => {
    const isA = speaker === "A";
    const currentLang = isA ? langA : langB;
    const otherLang = isA ? langB : langA;
    const setLang = isA ? setLangA : setLangB;
    
    // Side A is light, Side B is dark
    const bgClass = isA ? "bg-slate-50" : "bg-slate-900";
    const textClass = isA ? "text-slate-900" : "text-white";
    const activeRing = isA ? "ring-red-500/40" : "ring-amber-500/40";
    
    // Animate ring if this is the active speaker and we are actively translating
    const isActive = running && (activeSpeaker === speaker) && (status === "listening" || status === "translating");

    const myExchanges = log.filter(e => e.speaker === speaker || e.targetLang === currentLang);
    const myPendings = pendings.filter(p => p.speaker === speaker);

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
            disabled={running}
            onChange={setLang}
            dark={!isA}
          />
          {isA && (
            <div className="flex gap-2 bg-white/50 backdrop-blur-md rounded-full p-1 shadow-sm">
               <Button variant="ghost" size="icon" onClick={() => setFlipped(!flipped)} title="Flip Side B" className="text-slate-600 rounded-full">
                 <RotateCw className="w-5 h-5" />
               </Button>
               <Button variant="ghost" size="icon" onClick={handleGenerateSummary} title="Summary" disabled={isSummarizing} className="text-slate-600 rounded-full">
                 {isSummarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
               </Button>
               <Button variant="ghost" size="icon" onClick={clearLog} title="Clear" className="text-slate-600 rounded-full">
                 <Trash2 className="w-5 h-5" />
               </Button>
            </div>
          )}
        </div>

        {/* Chat History & Pending */}
        <div ref={isA ? scrollRefA : scrollRefB} className="flex-1 overflow-y-auto px-6 pt-24 pb-32 flex flex-col gap-6 scroll-smooth">
          {myExchanges.map((ex, i) => (
            <div key={ex.id || i} className={cn("flex flex-col max-w-[85%]", ex.speaker === speaker ? "self-end items-end" : "self-start items-start")}>
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
          
          {/* Pending / Interim Text */}
          {myPendings.map(p => (
            <div key={p.id} className="flex flex-col max-w-[85%] self-end items-end animate-pulse">
               <div className={cn("px-5 py-4 rounded-3xl text-xl md:text-2xl font-medium shadow-sm opacity-60", isA ? "bg-white text-slate-900" : "bg-slate-800 text-white")}>
                 {p.original}
               </div>
            </div>
          ))}

          {interim && activeSpeaker === speaker && (
             <div className="flex flex-col max-w-[85%] self-end items-end animate-in fade-in slide-in-from-bottom-2">
               <div className={cn("px-5 py-4 rounded-3xl text-xl md:text-2xl font-medium shadow-sm border-2 border-dashed", isA ? "border-slate-300 bg-white" : "border-slate-600 bg-slate-800 text-white")}>
                 {interim}
               </div>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col md:flex-row overflow-hidden font-sans touch-none select-none">
      
      {/* ERROR OVERLAY */}
      {permissionError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5" />
          Microphone Permission Denied
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

      {/* Central Floating Action Button */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
        <button
           onClick={running ? stop : start}
           className={cn(
             "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
             running ? "bg-red-500 hover:bg-red-600 scale-110" : "bg-primary hover:bg-primary/90 scale-100",
             "border-4 border-white/20 backdrop-blur-md"
           )}
        >
          {running && status === "listening" && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-red-500" />
          )}
          {running && status === "translating" && (
            <span className="absolute inset-0 rounded-full animate-pulse opacity-80 bg-orange-500" />
          )}
          
          {running ? (
             status === "translating" ? <Loader2 className="w-8 h-8 text-white animate-spin z-10" /> : <StopCircle className="w-10 h-10 text-white z-10" />
          ) : (
             <Mic className="w-10 h-10 text-white z-10" />
          )}
        </button>
      </div>

    </div>
  );
}
