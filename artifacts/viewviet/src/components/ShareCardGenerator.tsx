import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { ImageIcon, Download, Loader2, RefreshCw, X, CheckCircle2 } from "lucide-react";

interface CardSection {
  cardTitle: string;
  text: string;
  imagePrompt: string;
}

interface RenderedCard {
  section: CardSection;
  dataUrl: string | null;
  status: "pending" | "loading" | "done" | "error";
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderCard(
  section: CardSection,
  articleTitle: string,
  imageUrl: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.onload = () => {
      // Cover fill
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);

      // Gradient overlay: dark top + very dark bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0.55)");
      grad.addColorStop(0.28, "rgba(0,0,0,0.25)");
      grad.addColorStop(0.6, "rgba(0,0,0,0.45)");
      grad.addColorStop(1, "rgba(0,0,0,0.90)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const PAD = 72;

      // Article title (top, smaller)
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `500 38px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
      const titleLines = wrapText(ctx, articleTitle, W - PAD * 2);
      let ty = 100;
      for (const line of titleLines.slice(0, 2)) {
        ctx.fillText(line, PAD, ty);
        ty += 52;
      }

      // Gold accent bar
      ctx.fillStyle = "#F2A900";
      ctx.fillRect(PAD, ty + 16, 64, 6);

      // Card title (big bold)
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 72px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
      const cardTitleLines = wrapText(ctx, section.cardTitle, W - PAD * 2);
      let cty = ty + 68;
      for (const line of cardTitleLines.slice(0, 3)) {
        ctx.fillText(line, PAD, cty);
        cty += 90;
      }

      // Main content text (bottom area)
      ctx.font = `44px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
      const textLines = wrapText(ctx, section.text, W - PAD * 2);
      const lineH = 64;
      const totalTextH = textLines.length * lineH;
      let textY = H - 200 - totalTextH;
      if (textY < cty + 60) textY = cty + 60;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      for (const line of textLines) {
        ctx.fillText(line, PAD, textY);
        textY += lineH;
      }

      // Bottom branding
      ctx.fillStyle = "#F2A900";
      ctx.font = `bold 40px "PingFang SC", "Noto Sans SC", sans-serif`;
      ctx.fillText("ViewViet", PAD, H - 72);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `30px "PingFang SC", "Noto Sans SC", sans-serif`;
      ctx.fillText("跨境生活·法律·旅行", PAD + 190, H - 72);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = `${BASE}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  });
}

interface Props {
  title: string;
  content: string;
}

export function ShareCardGenerator({ title, content }: Props) {
  const { isAdmin } = useAuth();
  const [phase, setPhase] = useState<"idle" | "extracting" | "generating" | "done">("idle");
  const [cards, setCards] = useState<RenderedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const generate = useCallback(async () => {
    if (!title || !content) return;
    abortRef.current = false;
    setError(null);
    setCards([]);
    setPhase("extracting");

    try {
      // Step 1: Extract card sections
      const extractRes = await fetch(`${BASE}/api/admin/generate-share-cards`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!extractRes.ok) {
        const d = await extractRes.json();
        throw new Error(d.error ?? "提取失败");
      }
      const { cards: sections } = (await extractRes.json()) as { cards: CardSection[] };

      if (!sections?.length) throw new Error("未生成卡片内容");

      const initial: RenderedCard[] = sections.map((s) => ({
        section: s,
        dataUrl: null,
        status: "pending",
      }));
      setCards(initial);
      setPhase("generating");

      // Step 2: Generate images in groups of 3 (parallel)
      const batchSize = 3;
      for (let i = 0; i < sections.length; i += batchSize) {
        if (abortRef.current) break;
        const batch = sections.slice(i, i + batchSize);

        // Mark batch as loading
        setCards((prev) => {
          const next = [...prev];
          for (let j = i; j < i + batch.length; j++) {
            next[j] = { ...next[j], status: "loading" };
          }
          return next;
        });

        await Promise.all(
          batch.map(async (section, bi) => {
            const idx = i + bi;
            try {
              // Generate DALL-E image
              const imgRes = await fetch(`${BASE}/api/admin/generate-card-image`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: section.imagePrompt }),
              });
              if (!imgRes.ok) throw new Error("图片生成失败");
              const { imageUrl } = await imgRes.json();

              // Render canvas card
              const dataUrl = await renderCard(section, title, imageUrl);

              setCards((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], dataUrl, status: "done" };
                return next;
              });
            } catch {
              setCards((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], status: "error" };
                return next;
              });
            }
          }),
        );
      }

      setPhase("done");
    } catch (e: any) {
      setError(e?.message ?? "生成失败");
      setPhase("idle");
    }
  }, [title, content]);

  const downloadCard = (dataUrl: string, index: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title.slice(0, 20)}-card-${index + 1}.png`;
    a.click();
  };

  const downloadAll = () => {
    cards.forEach((c, i) => {
      if (c.dataUrl) {
        setTimeout(() => downloadCard(c.dataUrl!, i), i * 200);
      }
    });
  };

  const reset = () => {
    abortRef.current = true;
    setPhase("idle");
    setCards([]);
    setError(null);
  };

  if (!isAdmin) return null;

  const doneCount = cards.filter((c) => c.status === "done").length;
  const totalCount = cards.length;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm">生成小红书分享图</span>
        <span className="text-xs text-muted-foreground">（仅管理员可见）</span>
        {(phase === "generating" || phase === "done") && (
          <span className="text-xs text-muted-foreground ml-auto">
            {doneCount}/{totalCount} 张
          </span>
        )}
      </div>

      {phase === "idle" && (
        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={!content} className="gap-2">
            <ImageIcon className="w-4 h-4" />
            根据文章内容生成分享卡片
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {phase === "extracting" && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          AI 分析文章内容，提取卡片要点…
        </div>
      )}

      {(phase === "generating" || phase === "done") && (
        <>
          {phase === "generating" && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在生成图片… ({doneCount}/{totalCount})
            </div>
          )}

          {phase === "done" && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                全部生成完成 ({doneCount} 张)
              </div>
              <Button size="sm" variant="outline" onClick={downloadAll} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                下载全部
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                重新生成
              </Button>
            </div>
          )}

          {/* Card preview scroll row */}
          <div className="flex gap-3 overflow-x-auto pb-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] rounded-xl overflow-hidden border bg-muted/30 relative group"
                style={{ aspectRatio: "9/16" }}
              >
                {card.status === "loading" || card.status === "pending" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">生成中…</span>
                  </div>
                ) : card.status === "error" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
                    <X className="w-6 h-6 text-destructive" />
                    <span className="text-xs text-destructive">生成失败</span>
                  </div>
                ) : card.dataUrl ? (
                  <>
                    <img
                      src={card.dataUrl}
                      alt={card.section.cardTitle}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-4 gap-2">
                      <p className="text-white text-xs font-medium px-2 text-center line-clamp-2">
                        {card.section.cardTitle}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1"
                        onClick={() => downloadCard(card.dataUrl!, i)}
                      >
                        <Download className="w-3 h-3" />
                        下载
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
