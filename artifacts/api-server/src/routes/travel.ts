import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, travelGuidesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetTravelGuidesQueryParams,
  CreateTravelGuideBody,
  GetTravelGuideParams,
  UpdateTravelGuideParams,
  DeleteTravelGuideParams,
} from "@workspace/api-zod";

async function fetchPage(url: string): Promise<{ plainText: string; coverImage: string }> {
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), 25000);
  const resp = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });
  clearTimeout(tm);
  const html = await resp.text();
  const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const coverImage = ogImg?.[1] ?? "";
  const plainText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(p|div|section|article|h[1-6]|li|br|tr|blockquote|pre)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 80000);
  return { plainText, coverImage };
}

const GUIDE_AI_PROMPT = `你是专业旅游内容编辑，专门从中文公众号文章或旅游网页提取攻略结构化数据。

任务：从以下网页内容提取旅游攻略完整信息。

要求：
1. content 必须包含完整攻略正文，转换为 Markdown 格式（## 景点/行程/美食等章节、- 列表、**提示** 加粗）
2. 不得截断或省略任何段落
3. 原文中的表格必须使用 Markdown 表格格式（| 列1 | 列2 |\n| --- | --- |\n| 数据 | 数据 |），不得将表格内容转为纯文字
4. summary 为 2-3 句话简介（50-80字），突出攻略亮点

返回有效 JSON（不加代码块或其他任何文字）：
{
  "title": "攻略完整中文标题",
  "titleEn": "English title",
  "summary": "2-3句话摘要",
  "content": "完整攻略正文 Markdown 格式，保留所有段落",
  "country": "越南|泰国|马来西亚|新加坡|印度尼西亚|柬埔寨|缅甸|菲律宾|老挝|东南亚",
  "city": "城市名（中文）",
  "category": "美食|购物|景点|住宿|交通|文化|自然|亲子|其他",
  "budgetRange": "预算范围（例：200-500元/天，若无则 null）"
}`;

const router: IRouter = Router();

router.get("/travel-guides", async (req, res): Promise<void> => {
  const parsed = GetTravelGuidesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, country, city, search, page, limit } = parsed.data;

  const conditions = [eq(travelGuidesTable.isPublished, true)];
  if (category) conditions.push(eq(travelGuidesTable.category, category));
  if (country) conditions.push(eq(travelGuidesTable.country, country));
  if (city) conditions.push(eq(travelGuidesTable.city, city));
  if (search) conditions.push(ilike(travelGuidesTable.title, `%${search}%`));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(travelGuidesTable).where(where).limit(limit).offset(offset).orderBy(desc(travelGuidesTable.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(travelGuidesTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/travel-guides/featured", async (_req, res): Promise<void> => {
  const data = await db
    .select()
    .from(travelGuidesTable)
    .where(and(eq(travelGuidesTable.isPublished, true), eq(travelGuidesTable.isFeatured, true)))
    .orderBy(desc(travelGuidesTable.viewCount))
    .limit(5);
  res.json(data);
});

router.get("/travel-guides/:id", async (req, res): Promise<void> => {
  const params = GetTravelGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [guide] = await db.select().from(travelGuidesTable).where(eq(travelGuidesTable.id, params.data.id));
  if (!guide) {
    res.status(404).json({ error: "Guide not found" });
    return;
  }
  await db
    .update(travelGuidesTable)
    .set({ viewCount: guide.viewCount + 1 })
    .where(eq(travelGuidesTable.id, guide.id));
  res.json({ ...guide, viewCount: guide.viewCount + 1 });
});

router.post("/admin/travel-guides", async (req, res): Promise<void> => {
  const parsed = CreateTravelGuideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [guide] = await db.insert(travelGuidesTable).values(parsed.data).returning();
  res.status(201).json(guide);
});

router.put("/admin/travel-guides/:id", async (req, res): Promise<void> => {
  const params = UpdateTravelGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTravelGuideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [guide] = await db
    .update(travelGuidesTable)
    .set(parsed.data)
    .where(eq(travelGuidesTable.id, params.data.id))
    .returning();
  if (!guide) {
    res.status(404).json({ error: "Guide not found" });
    return;
  }
  res.json(guide);
});

router.delete("/admin/travel-guides/:id", async (req, res): Promise<void> => {
  const params = DeleteTravelGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(travelGuidesTable)
    .where(eq(travelGuidesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Guide not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/admin/guides/import-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") { res.status(400).json({ error: "url is required" }); return; }
  let page: { plainText: string; coverImage: string };
  try { page = await fetchPage(url); } catch (e: any) {
    res.status(400).json({ error: `无法访问链接: ${e?.message ?? e}` }); return;
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-pro", max_completion_tokens: 16384,
      messages: [
        { role: "system", content: GUIDE_AI_PROMPT },
        { role: "user", content: `请从以下网页内容提取旅游攻略信息：\n\n${page.plainText}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 未返回有效 JSON");
    res.json({ ...JSON.parse(match[0]), coverImage: page.coverImage });
  } catch (e: any) { res.status(500).json({ error: `AI 提取失败: ${e?.message ?? e}` }); }
});

router.post("/admin/guides/batch-import", async (req, res): Promise<void> => {
  const { urls } = req.body as { urls?: string[] };
  if (!Array.isArray(urls) || urls.length === 0) { res.status(400).json({ error: "urls array required" }); return; }
  const succeeded: { url: string; id: number; title: string }[] = [];
  const failed: { url: string; error: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;
    try {
      const page = await fetchPage(url);
      const completion = await openai.chat.completions.create({
        model: "gemini-2.5-pro", max_completion_tokens: 16384,
        messages: [
          { role: "system", content: GUIDE_AI_PROMPT },
          { role: "user", content: `请从以下网页内容提取旅游攻略信息：\n\n${page.plainText}` },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI 未返回有效 JSON");
      const data = JSON.parse(match[0]);
      const [saved] = await db.insert(travelGuidesTable).values({
        title: data.title ?? "未命名攻略",
        titleEn: data.titleEn ?? null,
        summary: data.summary ?? null,
        content: data.content ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        category: data.category ?? null,
        budgetRange: data.budgetRange ?? null,
        coverImage: page.coverImage || null,
        isPublished: true,
        isFeatured: false,
      } as any).returning();
      succeeded.push({ url, id: saved.id, title: saved.title });
    } catch (e: any) {
      failed.push({ url, error: e?.message ?? String(e) });
    }
  }
  res.json({ succeeded, failed });
});

export default router;
