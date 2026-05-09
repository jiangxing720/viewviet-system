import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check } from "lucide-react";

interface Activity {
  title?: string;
  category?: string;
  startTime?: string;
  location?: string;
  coverImage?: string;
  organizerName?: string;
  maxParticipants?: number;
  currentParticipants?: number;
}

interface ActivityPosterProps {
  activity: Activity;
  open: boolean;
  onClose: () => void;
}

type TemplateId = "dark" | "gold" | "light";

const TEMPLATES: { id: TemplateId; label: string; desc: string; previewBg: string; previewAccent: string }[] = [
  { id: "dark",  label: "深夜蓝", desc: "深色简约",  previewBg: "linear-gradient(135deg,#061414 0%,#0c2424 100%)", previewAccent: "#4dbdc0" },
  { id: "gold",  label: "暖金调", desc: "深底金字",  previewBg: "linear-gradient(135deg,#1a1200 0%,#2a1e00 100%)", previewAccent: "#F2A900" },
  { id: "light", label: "清爽白", desc: "浅色清新",  previewBg: "linear-gradient(135deg,#f8fffe 0%,#e6f7f7 100%)", previewAccent: "#0D7377" },
];

// ─── Canvas generators ────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapCJK(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      lines.push(cur); cur = ch;
      if (lines.length >= maxLines) { cur = ""; break; }
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
    setTimeout(() => res(null), 3500);
  });
}

function drawCoverInCanvas(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

const FONT = `"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif`;

async function genDark(a: Activity): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1620;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // bg
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#061414"); bg.addColorStop(0.5, "#0c2424"); bg.addColorStop(1, "#071a1a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // blobs
  [[980,240,480,0.17],[160,1350,560,0.12],[580,900,300,0.08]].forEach(([x,y,r,al]) => {
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=`rgba(13,115,119,${al})`; ctx.fill();
  });

  // header
  ctx.fillStyle = "#4dbdc0";
  ctx.font = `bold 56px ${FONT}`; ctx.fillText("ViewViet", 80, 100);
  ctx.fillStyle = "rgba(77,189,192,0.5)";
  ctx.font = `32px ${FONT}`; ctx.fillText("跨境生活 · 活动社区", 80, 148);

  // cover image
  const imgY = 180;
  const imgH = 640;
  const img = a.coverImage ? await loadImg(a.coverImage) : null;
  if (img) {
    drawCoverInCanvas(ctx, img, 60, imgY, W - 120, imgH, 32);
    const ov = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
    ov.addColorStop(0, "rgba(6,20,20,0)"); ov.addColorStop(0.55, "rgba(6,20,20,0.05)"); ov.addColorStop(1, "rgba(6,20,20,0.85)");
    ctx.fillStyle = ov; roundRect(ctx, 60, imgY, W - 120, imgH, 32); ctx.fill();
  }

  // category
  let bodyY = imgY + imgH + 56;
  if (a.category) {
    ctx.fillStyle = "rgba(13,115,119,0.8)";
    roundRect(ctx, 80, bodyY, 240, 60, 30); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `bold 30px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText(a.category, 80+120, bodyY+40); ctx.textAlign = "left";
    bodyY += 80;
  }

  // title
  ctx.fillStyle = "#fff"; ctx.font = `bold 96px ${FONT}`;
  const lines = wrapCJK(ctx, a.title ?? "活动", W - 160, 3);
  lines.forEach((l, i) => ctx.fillText(l, 80, bodyY + i * 116 + 96));
  bodyY += lines.length * 116 + 56;

  // info box
  const infoH = [a.startTime, a.location, a.organizerName].filter(Boolean).length * 80 + 48;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, 60, bodyY, W - 120, infoH, 28); ctx.fill();
  let iy = bodyY + 58;
  const pairs: [string, string][] = [];
  if (a.startTime) {
    const d = new Date(a.startTime);
    pairs.push(["时间", d.toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}) + "  " + d.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})]);
  }
  if (a.location) pairs.push(["地点", a.location.length > 22 ? a.location.slice(0,22)+"…" : a.location]);
  if (a.organizerName) pairs.push(["主办", a.organizerName]);
  pairs.forEach(([k, v]) => {
    ctx.font = `40px ${FONT}`; ctx.fillStyle = "#4dbdc0"; ctx.fillText(k, 100, iy);
    ctx.fillStyle = "#fff"; ctx.fillText(v, 260, iy); iy += 80;
  });

  // branding footer — flush at very bottom
  ctx.fillStyle = "rgba(13,115,119,0.45)";
  ctx.fillRect(0, H - 110, W, 110);
  ctx.fillStyle = "rgba(77,189,192,0.9)"; ctx.font = `bold 42px ${FONT}`; ctx.textAlign = "left";
  ctx.fillText("viewviet.com", 80, H - 44);
  ctx.fillStyle = "rgba(142,207,209,0.7)"; ctx.font = `36px ${FONT}`; ctx.textAlign = "right";
  ctx.fillText("扫码报名参与", W - 80, H - 44);

  return cv;
}

async function genGold(a: Activity): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1620;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // bg
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#120d00"); bg.addColorStop(1, "#1e1500");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // gold circle blobs
  [[W*0.85, H*0.1, 420, 0.12],[W*0.15, H*0.88, 500, 0.08]].forEach(([x,y,r,al]) => {
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=`rgba(242,169,0,${al})`; ctx.fill();
  });

  // top bar
  const barH = 140;
  ctx.fillStyle = "#F2A900"; ctx.fillRect(0, 0, W, barH);
  ctx.fillStyle = "#120d00"; ctx.font = `bold 64px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("ViewViet", W/2, 96); ctx.textAlign = "left";

  // cover image
  const img = a.coverImage ? await loadImg(a.coverImage) : null;
  const imgY = barH + 48, imgH = 600;
  if (img) {
    drawCoverInCanvas(ctx, img, 60, imgY, W - 120, imgH, 24);
    const ov = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
    ov.addColorStop(0,"rgba(18,13,0,0)"); ov.addColorStop(1,"rgba(18,13,0,0.8)");
    ctx.fillStyle = ov; roundRect(ctx, 60, imgY, W-120, imgH, 24); ctx.fill();
  }

  // gold divider
  const divY = imgY + imgH + 52;
  ctx.strokeStyle = "#F2A900"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(80, divY); ctx.lineTo(W - 80, divY); ctx.stroke();

  // category
  let bodyY = divY + 48;
  if (a.category) {
    ctx.strokeStyle = "#F2A900"; ctx.lineWidth = 2;
    roundRect(ctx, 80, bodyY, 260, 60, 30); ctx.stroke();
    ctx.fillStyle = "#F2A900"; ctx.font = `bold 32px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText(a.category, 80+130, bodyY+40); ctx.textAlign = "left";
    bodyY += 84;
  }

  // title
  ctx.fillStyle = "#F2A900"; ctx.font = `bold 100px ${FONT}`;
  const lines = wrapCJK(ctx, a.title ?? "活动", W - 160, 3);
  lines.forEach((l, i) => ctx.fillText(l, 80, bodyY + i * 120 + 100));
  bodyY += lines.length * 120 + 56;

  // info
  const pairs: [string, string][] = [];
  if (a.startTime) {
    const d = new Date(a.startTime);
    pairs.push(["时间", d.toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}) + "  " + d.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})]);
  }
  if (a.location) pairs.push(["地点", a.location.length > 22 ? a.location.slice(0,22)+"…" : a.location]);
  if (a.organizerName) pairs.push(["主办", a.organizerName]);
  pairs.forEach(([k, v]) => {
    ctx.font = `38px ${FONT}`; ctx.fillStyle = "#F2A900"; ctx.fillText(k + "  ", 80, bodyY + 42);
    const kW = ctx.measureText(k + "  ").width;
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText(v, 80 + kW, bodyY + 42);
    bodyY += 80;
  });

  // footer
  ctx.strokeStyle = "#F2A900"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80, H - 130); ctx.lineTo(W - 80, H - 130); ctx.stroke();
  ctx.fillStyle = "#F2A900"; ctx.font = `bold 44px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("viewviet.com  ·  扫码报名参与", W / 2, H - 56);

  return cv;
}

async function genLight(a: Activity): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1620;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // bg
  ctx.fillStyle = "#f8fffe"; ctx.fillRect(0, 0, W, H);

  // teal header
  const headerH = 160;
  ctx.fillStyle = "#0D7377"; ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#fff"; ctx.font = `bold 64px ${FONT}`; ctx.textAlign = "left";
  ctx.fillText("ViewViet", 80, 104);
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `30px ${FONT}`;
  ctx.fillText("活动社区  ·  跨境生活", 80, 144);

  // cover
  const imgY = headerH + 48, imgH = 580;
  const img = a.coverImage ? await loadImg(a.coverImage) : null;
  if (img) {
    drawCoverInCanvas(ctx, img, 60, imgY, W - 120, imgH, 28);
  } else {
    ctx.fillStyle = "#e0f4f4";
    roundRect(ctx, 60, imgY, W-120, imgH, 28); ctx.fill();
    ctx.fillStyle = "#0D7377"; ctx.font = `48px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText("ViewViet", W/2, imgY + imgH/2); ctx.textAlign = "left";
  }

  // card
  let bodyY = imgY + imgH + 48;
  ctx.fillStyle = "#fff";
  roundRect(ctx, 60, bodyY, W-120, H - bodyY - 80, 32); ctx.fill();
  ctx.strokeStyle = "#e0f4f4"; ctx.lineWidth = 1.5;
  roundRect(ctx, 60, bodyY, W-120, H - bodyY - 80, 32); ctx.stroke();
  bodyY += 52;

  // category
  if (a.category) {
    ctx.fillStyle = "#0D7377";
    roundRect(ctx, 100, bodyY, 220, 56, 28); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `bold 28px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText(a.category, 100+110, bodyY+37); ctx.textAlign = "left";
    bodyY += 76;
  }

  // title
  ctx.fillStyle = "#0a2a2a"; ctx.font = `bold 88px ${FONT}`;
  const lines = wrapCJK(ctx, a.title ?? "活动", W - 240, 3);
  lines.forEach((l, i) => ctx.fillText(l, 100, bodyY + i * 108 + 88));
  bodyY += lines.length * 108 + 52;

  // divider
  ctx.strokeStyle = "#e0f4f4"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(100, bodyY); ctx.lineTo(W-100, bodyY); ctx.stroke();
  bodyY += 44;

  // info
  const pairs: [string, string][] = [];
  if (a.startTime) {
    const d = new Date(a.startTime);
    pairs.push(["时间", d.toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}) + "  " + d.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})]);
  }
  if (a.location) pairs.push(["地点", a.location.length > 22 ? a.location.slice(0,22)+"…" : a.location]);
  if (a.organizerName) pairs.push(["主办", a.organizerName]);
  pairs.forEach(([k, v]) => {
    ctx.font = `38px ${FONT}`; ctx.fillStyle = "#0D7377"; ctx.fillText(k, 100, bodyY + 40);
    const kW = ctx.measureText(k).width + 20;
    ctx.fillStyle = "#1a3a3a"; ctx.fillText(v, 100 + kW, bodyY + 40);
    bodyY += 76;
  });

  // footer
  ctx.fillStyle = "#0D7377"; ctx.fillRect(60, H - 100, W - 120, 60);
  roundRect(ctx, 60, H - 100, W - 120, 60, 16); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `bold 36px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("viewviet.com  ·  扫码报名参与", W / 2, H - 58);

  return cv;
}

async function generatePoster(templateId: TemplateId, activity: Activity): Promise<HTMLCanvasElement> {
  if (templateId === "gold") return genGold(activity);
  if (templateId === "light") return genLight(activity);
  return genDark(activity);
}

// ─── Preview components ───────────────────────────────────────────────────────

function DarkPreview({ a, dateStr, timeStr }: { a: Activity; dateStr: string | null; timeStr: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-xl w-full" style={{ background: "linear-gradient(145deg,#061414 0%,#0c2424 50%,#071a1a 100%)", minHeight: 420 }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" style={{ background: "#0D7377", transform: "translate(30%,-30%)" }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-15" style={{ background: "#0D7377", transform: "translate(-30%,30%)" }} />
      {a.coverImage && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden" style={{ height: 160, backgroundImage: `url(${a.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="w-full h-full" style={{ background: "linear-gradient(to bottom,transparent 40%,rgba(6,20,20,0.75))" }} />
        </div>
      )}
      <div className={`relative z-10 px-4 pb-3 ${a.coverImage ? "pt-2" : "pt-6"}`}>
        <p className="text-[#4dbdc0] text-[10px] font-bold tracking-widest uppercase mb-2">ViewViet · 活动社区</p>
        {a.category && <span className="inline-block text-[10px] text-white bg-primary/70 rounded-full px-2 py-0.5 mb-1.5">{a.category}</span>}
        <h3 className="text-white font-bold text-base leading-snug mb-3 line-clamp-2">{a.title}</h3>
        <div className="rounded-lg p-2 space-y-1 mb-3" style={{ background: "rgba(255,255,255,0.07)" }}>
          {dateStr && <div className="flex gap-1.5 text-[10px]"><span className="text-[#4dbdc0] font-semibold w-6">时间</span><span className="text-white/80">{dateStr}</span></div>}
          {a.location && <div className="flex gap-1.5 text-[10px]"><span className="text-[#4dbdc0] font-semibold w-6">地点</span><span className="text-white/80 truncate">{a.location}</span></div>}
        </div>
        <div className="border-t border-white/10 pt-2 flex justify-between">
          <span className="text-[#4dbdc0] text-[10px] font-bold">viewviet.com</span>
          <span className="text-white/40 text-[10px]">扫码报名</span>
        </div>
      </div>
    </div>
  );
}

function GoldPreview({ a, dateStr, timeStr }: { a: Activity; dateStr: string | null; timeStr: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-xl w-full" style={{ background: "linear-gradient(145deg,#120d00 0%,#1e1500 100%)", minHeight: 420 }}>
      <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-10" style={{ background: "#F2A900", transform: "translate(30%,-30%)" }} />
      <div className="h-10 flex items-center px-4" style={{ background: "#F2A900" }}>
        <span className="font-bold text-[#120d00] text-xs tracking-wider">ViewViet</span>
      </div>
      {a.coverImage && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden" style={{ height: 148, backgroundImage: `url(${a.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="w-full h-full" style={{ background: "linear-gradient(to bottom,transparent 50%,rgba(18,13,0,0.7))" }} />
        </div>
      )}
      <div className="px-4 py-3">
        <div className="border-b border-[#F2A900]/40 pb-2 mb-2" />
        {a.category && <span className="inline-block text-[10px] text-[#F2A900] border border-[#F2A900]/60 rounded-full px-2 py-0.5 mb-1.5">{a.category}</span>}
        <h3 className="text-[#F2A900] font-bold text-base leading-snug mb-3 line-clamp-2">{a.title}</h3>
        {dateStr && <p className="text-[10px] text-white/70"><span className="text-[#F2A900]">时间</span>　{dateStr}</p>}
        {a.location && <p className="text-[10px] text-white/70 mt-0.5"><span className="text-[#F2A900]">地点</span>　{a.location}</p>}
        <div className="border-t border-[#F2A900]/30 mt-2 pt-2">
          <span className="text-[#F2A900] text-[10px] font-bold">viewviet.com · 扫码报名参与</span>
        </div>
      </div>
    </div>
  );
}

function LightPreview({ a, dateStr, timeStr }: { a: Activity; dateStr: string | null; timeStr: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-xl w-full border border-[#e0f4f4]" style={{ background: "#f8fffe", minHeight: 420 }}>
      <div className="h-11 flex items-center px-4" style={{ background: "#0D7377" }}>
        <span className="font-bold text-white text-xs tracking-wider">ViewViet  ·  活动社区</span>
      </div>
      {a.coverImage && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden" style={{ height: 148, backgroundImage: `url(${a.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      <div className="mx-3 my-2 rounded-xl p-3" style={{ background: "#fff", border: "1px solid #e0f4f4" }}>
        {a.category && <span className="inline-block text-[10px] text-white rounded-full px-2 py-0.5 mb-1.5" style={{ background: "#0D7377" }}>{a.category}</span>}
        <h3 className="text-[#0a2a2a] font-bold text-base leading-snug mb-2 line-clamp-2">{a.title}</h3>
        <div className="border-t border-[#e0f4f4] pt-2 space-y-0.5">
          {dateStr && <p className="text-[10px] text-gray-600"><span className="text-[#0D7377] font-semibold">时间</span>　{dateStr}</p>}
          {a.location && <p className="text-[10px] text-gray-600"><span className="text-[#0D7377] font-semibold">地点</span>　{a.location}</p>}
        </div>
      </div>
      <div className="mx-3 rounded-lg py-2 text-center" style={{ background: "#0D7377" }}>
        <span className="text-white text-[10px] font-bold">viewviet.com  ·  扫码报名参与</span>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ActivityPosterModal({ activity: a, open, onClose }: ActivityPosterProps) {
  const [selected, setSelected] = useState<TemplateId>("dark");
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  const dateStr = a.startTime
    ? new Date(a.startTime).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
    : null;
  const timeStr = a.startTime
    ? new Date(a.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : null;

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await generatePoster(selected, a);
      const link = document.createElement("a");
      link.download = `viewviet-poster-${selected}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [selected, a]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: a.title ?? "活动", url });
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }, [a.title]);

  const previewProps = { a, dateStr, timeStr };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-bold">选择海报样式</DialogTitle>
        </DialogHeader>

        {/* Template selector */}
        <div className="px-5 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  selected === t.id ? "border-primary shadow-md scale-[1.02]" : "border-transparent opacity-80 hover:opacity-100"
                }`}
                type="button"
              >
                <div className="h-20 rounded-lg" style={{ background: t.previewBg }}>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                    <div className="w-12 h-1.5 rounded-full" style={{ background: t.previewAccent }} />
                    <div className="w-8 h-1.5 rounded-full opacity-50" style={{ background: t.previewAccent }} />
                    <div className="w-10 h-1 rounded-full opacity-30" style={{ background: t.previewAccent }} />
                  </div>
                </div>
                <div className="text-center py-1.5">
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
                {selected === t.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Full poster preview */}
        <div className="px-5 pb-3">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            {selected === "dark" && <DarkPreview {...previewProps} />}
            {selected === "gold" && <GoldPreview {...previewProps} />}
            {selected === "light" && <LightPreview {...previewProps} />}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <Button className="flex-1 gap-1.5" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" />
            {downloading ? "生成中…" : "下载海报"}
          </Button>
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handleShare}>
            {shared ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            {shared ? "已复制链接" : "分享链接"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
