import { useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, X } from "lucide-react";

interface ActivityPosterProps {
  activity: {
    title?: string;
    description?: string;
    category?: string;
    startTime?: string;
    location?: string;
    coverImage?: string;
    organizerName?: string;
    maxParticipants?: number;
    currentParticipants?: number;
  };
  open: boolean;
  onClose: () => void;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
): { lines: string[]; totalHeight: number } {
  const words = text.split("");
  const lines: string[] = [];
  let current = "";
  for (const ch of words) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return { lines, totalHeight: lines.length * lineHeight };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

async function generatePosterCanvas(
  activity: ActivityPosterProps["activity"],
): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1440;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient (dark teal)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#061414");
  bg.addColorStop(0.5, "#0c2424");
  bg.addColorStop(1, "#071a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative blobs
  const blobs = [
    { x: 950, y: 260, r: 440 },
    { x: 180, y: 1200, r: 520 },
    { x: 580, y: 800, r: 280 },
  ];
  blobs.forEach(({ x, y, r }, i) => {
    const alpha = [0.18, 0.13, 0.09][i];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(13,115,119,${alpha})`;
    ctx.fill();
  });

  // Try to load cover image
  if (activity.coverImage) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = activity.coverImage!;
        setTimeout(resolve, 3000);
      });
      if (img.complete && img.naturalWidth > 0) {
        // Draw image in top portion
        const imgH = Math.round(H * 0.52);
        ctx.save();
        roundRect(ctx, 60, 200, W - 120, imgH, 32);
        ctx.clip();
        const scale = Math.max((W - 120) / img.naturalWidth, imgH / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, 60 + ((W - 120) - dw) / 2, 200 + (imgH - dh) / 2, dw, dh);
        ctx.restore();
        // Overlay gradient on image bottom
        const ov = ctx.createLinearGradient(0, 200, 0, 200 + imgH);
        ov.addColorStop(0, "rgba(6,20,20,0)");
        ov.addColorStop(0.6, "rgba(6,20,20,0.1)");
        ov.addColorStop(1, "rgba(6,20,20,0.9)");
        ctx.fillStyle = ov;
        roundRect(ctx, 60, 200, W - 120, imgH, 32);
        ctx.fill();
      }
    } catch {
      // use gradient only
    }
  }

  // ── Top branding ──
  ctx.fillStyle = "#4dbdc0";
  ctx.font = `bold 52px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText("ViewViet", 72, 140);

  ctx.fillStyle = "rgba(77,189,192,0.55)";
  ctx.font = `32px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText("跨境生活 · 活动社区", 72, 180);

  // ── Category badge ──
  if (activity.category) {
    ctx.fillStyle = "rgba(13,115,119,0.75)";
    roundRect(ctx, 72, H * 0.56, 260, 56, 28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `32px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(activity.category, 72 + 130, H * 0.56 + 38);
    ctx.textAlign = "left";
  }

  // ── Title ──
  const titleY = H * 0.62;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 88px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "left";
  const { lines } = wrapText(ctx, activity.title ?? "活动", 72, W - 144, 106, 3);
  lines.forEach((line, i) => {
    ctx.fillText(line, 72, titleY + i * 106);
  });

  // ── Info section ──
  const infoY = titleY + lines.length * 106 + 60;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 60, infoY, W - 120, 280, 24);
  ctx.fill();

  ctx.font = `40px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  let infoOffset = infoY + 64;

  if (activity.startTime) {
    const d = new Date(activity.startTime);
    ctx.fillStyle = "#4dbdc0";
    ctx.fillText("时间", 100, infoOffset);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }) +
        "  " +
        d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      240,
      infoOffset,
    );
    infoOffset += 76;
  }

  if (activity.location) {
    ctx.fillStyle = "#4dbdc0";
    ctx.fillText("地点", 100, infoOffset);
    ctx.fillStyle = "#ffffff";
    const locText = activity.location.length > 20 ? activity.location.slice(0, 20) + "…" : activity.location;
    ctx.fillText(locText, 240, infoOffset);
    infoOffset += 76;
  }

  if (activity.organizerName) {
    ctx.fillStyle = "#4dbdc0";
    ctx.fillText("主办", 100, infoOffset);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(activity.organizerName, 240, infoOffset);
  }

  // ── Bottom branding bar ──
  ctx.fillStyle = "rgba(13,115,119,0.4)";
  ctx.fillRect(0, H - 120, W, 120);

  ctx.fillStyle = "rgba(77,189,192,0.9)";
  ctx.font = `bold 40px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("viewviet.com", 72, H - 52);

  ctx.fillStyle = "rgba(142,207,209,0.6)";
  ctx.font = `34px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("扫码报名参与", W - 72, H - 52);

  return canvas;
}

export function ActivityPosterModal({ activity, open, onClose }: ActivityPosterProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await generatePosterCanvas(activity);
      const link = document.createElement("a");
      link.download = `viewviet-activity-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [activity]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: activity.title ?? "活动", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [activity.title]);

  // Format date for preview
  const dateStr = activity.startTime
    ? new Date(activity.startTime).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
    : null;
  const timeStr = activity.startTime
    ? new Date(activity.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>分享海报</DialogTitle>
        </DialogHeader>

        {/* Poster preview */}
        <div
          ref={previewRef}
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #061414 0%, #0c2424 50%, #071a1a 100%)",
            minHeight: 480,
          }}
        >
          {/* Blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: "#0D7377", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15" style={{ background: "#0D7377", transform: "translate(-30%, 30%)" }} />

          {/* Cover image */}
          {activity.coverImage && (
            <div
              className="mx-4 mt-4 rounded-2xl overflow-hidden"
              style={{ height: 200, backgroundImage: `url(${activity.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="w-full h-full" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(6,20,20,0.8))" }} />
            </div>
          )}

          <div className={`relative z-10 px-5 pb-5 ${activity.coverImage ? "pt-3" : "pt-8"}`}>
            {/* Branding */}
            <p className="text-[#4dbdc0] text-xs font-bold tracking-widest uppercase mb-3">ViewViet · 活动社区</p>

            {/* Category */}
            {activity.category && (
              <span className="inline-block text-xs text-white bg-primary/70 rounded-full px-3 py-1 mb-2">{activity.category}</span>
            )}

            {/* Title */}
            <h2 className="text-white font-bold text-2xl leading-snug mb-4 drop-shadow">
              {activity.title}
            </h2>

            {/* Info */}
            <div className="bg-white/8 rounded-xl p-3 space-y-2 mb-4" style={{ background: "rgba(255,255,255,0.07)" }}>
              {dateStr && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[#4dbdc0] font-semibold w-8 flex-shrink-0">时间</span>
                  <span className="text-white/90">{dateStr} {timeStr}</span>
                </div>
              )}
              {activity.location && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[#4dbdc0] font-semibold w-8 flex-shrink-0">地点</span>
                  <span className="text-white/90 line-clamp-1">{activity.location}</span>
                </div>
              )}
              {activity.organizerName && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[#4dbdc0] font-semibold w-8 flex-shrink-0">主办</span>
                  <span className="text-white/90">{activity.organizerName}</span>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <p className="text-[#4dbdc0] text-sm font-bold">viewviet.com</p>
              <p className="text-white/50 text-xs">扫码报名参与</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 bg-background flex gap-3">
          <Button className="flex-1" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4 mr-1.5" />
            {downloading ? "生成中…" : "下载海报"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1.5" />
            分享链接
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
