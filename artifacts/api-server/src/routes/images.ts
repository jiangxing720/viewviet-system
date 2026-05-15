import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/proxy-image", async (req, res): Promise<void> => {
  const { url } = req.query as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    res.status(400).json({ error: "only http/https allowed" });
    return;
  }

  try {
    const controller = new AbortController();
    const tm = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://mp.weixin.qq.com/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });
    clearTimeout(tm);

    if (!response.ok) {
      res.status(502).json({ error: `upstream ${response.status}` });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "url does not point to an image" });
      return;
    }

    const buf = await response.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(buf));
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? "fetch failed" });
  }
});

export default router;
