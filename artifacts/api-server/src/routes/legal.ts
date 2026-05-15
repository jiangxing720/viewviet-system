import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc, ne } from "drizzle-orm";
import { db, legalArticlesTable, legalDocumentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetLegalArticlesQueryParams,
  CreateLegalArticleBody,
  GetLegalArticleParams,
  GetRelatedLegalArticlesParams,
  UpdateLegalArticleParams,
  DeleteLegalArticleParams,
  GetLegalDocumentsQueryParams,
  CreateLegalDocumentBody,
  GetLegalDocumentParams,
  UpdateLegalDocumentParams,
  DeleteLegalDocumentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/legal-articles", async (req, res): Promise<void> => {
  const parsed = GetLegalArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, country, search, featured, page, limit } = parsed.data;

  const conditions = [eq(legalArticlesTable.isPublished, true)];
  if (category) conditions.push(eq(legalArticlesTable.category, category));
  if (country) conditions.push(eq(legalArticlesTable.country, country));
  if (search) conditions.push(ilike(legalArticlesTable.title, `%${search}%`));
  if (featured) conditions.push(eq(legalArticlesTable.isFeatured, true));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(legalArticlesTable).where(where).limit(limit).offset(offset).orderBy(desc(legalArticlesTable.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(legalArticlesTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/legal-articles/featured", async (_req, res): Promise<void> => {
  const data = await db
    .select()
    .from(legalArticlesTable)
    .where(and(eq(legalArticlesTable.isPublished, true), eq(legalArticlesTable.isFeatured, true)))
    .orderBy(desc(legalArticlesTable.createdAt))
    .limit(6);
  res.json(data);
});

router.get("/legal-articles/categories", async (_req, res): Promise<void> => {
  const result = await db
    .select({ category: legalArticlesTable.category, count: sql<number>`count(*)::int` })
    .from(legalArticlesTable)
    .where(and(eq(legalArticlesTable.isPublished, true), sql`${legalArticlesTable.category} IS NOT NULL`))
    .groupBy(legalArticlesTable.category);
  res.json(result.map((r) => ({ category: r.category, count: r.count })));
});

router.get("/legal-articles/related/:id", async (req, res): Promise<void> => {
  const params = GetRelatedLegalArticlesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db.select().from(legalArticlesTable).where(eq(legalArticlesTable.id, params.data.id));
  if (!article) {
    res.json([]);
    return;
  }
  const related = await db
    .select()
    .from(legalArticlesTable)
    .where(
      and(
        eq(legalArticlesTable.isPublished, true),
        ne(legalArticlesTable.id, params.data.id),
        article.category ? eq(legalArticlesTable.category, article.category) : sql`true`,
      ),
    )
    .limit(4);
  res.json(related);
});

router.get("/legal-articles/:slug", async (req, res): Promise<void> => {
  const params = GetLegalArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .select()
    .from(legalArticlesTable)
    .where(eq(legalArticlesTable.slug, params.data.slug));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  // Increment view count
  await db
    .update(legalArticlesTable)
    .set({ viewCount: article.viewCount + 1 })
    .where(eq(legalArticlesTable.id, article.id));
  res.json({ ...article, viewCount: article.viewCount + 1 });
});

// Admin: list ALL legal articles (including drafts)
router.get("/admin/legal-articles", async (req, res): Promise<void> => {
  const { search, category, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, Number(pageStr) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitStr) || 20));
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (search) conditions.push(ilike(legalArticlesTable.title, `%${search}%`));
  if (category) conditions.push(eq(legalArticlesTable.category, category));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(legalArticlesTable).where(where).limit(limit).offset(offset).orderBy(desc(legalArticlesTable.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(legalArticlesTable).where(where),
  ]);
  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.post("/admin/legal-articles", async (req, res): Promise<void> => {
  const parsed = CreateLegalArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [article] = await db.insert(legalArticlesTable).values(parsed.data).returning();
  res.status(201).json(article);
});

router.put("/admin/legal-articles/:id", async (req, res): Promise<void> => {
  const params = UpdateLegalArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLegalArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [article] = await db
    .update(legalArticlesTable)
    .set(parsed.data)
    .where(eq(legalArticlesTable.id, params.data.id))
    .returning();
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(article);
});

router.delete("/admin/legal-articles/:id", async (req, res): Promise<void> => {
  const params = DeleteLegalArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(legalArticlesTable)
    .where(eq(legalArticlesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.sendStatus(204);
});

// ── AI: Legal Article URL Import ─────────────────────────────────────────────

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

const LEGAL_ARTICLE_AI_PROMPT = `你是专业内容编辑，专门从中文公众号文章或法律资讯网页提取结构化数据。

任务：从以下网页内容提取法律文章完整信息。

要求：
1. content 必须包含完整正文，转换为 Markdown 格式（## 章节标题、- 列表、**重点** 加粗）
2. 不得截断或省略任何段落
3. summary 为 2-3 句话简介（50-80字），用于列表页展示

返回有效 JSON（不加代码块或其他任何文字）：
{
  "title": "文章完整中文标题",
  "summary": "2-3句话摘要",
  "content": "完整正文 Markdown 格式，保留所有段落",
  "category": "劳动法|公司注册|知识产权|税务|FDI/投资|房地产|移民签证|刑事|其他",
  "country": "越南|泰国|马来西亚|新加坡|印度尼西亚|柬埔寨|缅甸|东南亚"
}`;

router.post("/admin/legal-articles/import-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") { res.status(400).json({ error: "url is required" }); return; }
  let page: { plainText: string; coverImage: string };
  try { page = await fetchPage(url); } catch (e: any) {
    res.status(400).json({ error: `无法访问链接: ${e?.message ?? e}` }); return;
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1", max_completion_tokens: 16384,
      messages: [
        { role: "system", content: LEGAL_ARTICLE_AI_PROMPT },
        { role: "user", content: `请从以下网页内容提取法律文章信息：\n\n${page.plainText}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 未返回有效 JSON");
    res.json({ ...JSON.parse(match[0]), coverImage: page.coverImage });
  } catch (e: any) { res.status(500).json({ error: `AI 提取失败: ${e?.message ?? e}` }); }
});

router.post("/admin/legal-articles/batch-import", async (req, res): Promise<void> => {
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
        model: "gpt-5.1", max_completion_tokens: 16384,
        messages: [
          { role: "system", content: LEGAL_ARTICLE_AI_PROMPT },
          { role: "user", content: `请从以下网页内容提取法律文章信息：\n\n${page.plainText}` },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI 未返回有效 JSON");
      const data = JSON.parse(match[0]);
      const slug = `art-${Date.now()}-${i}-${Math.floor(Math.random() * 9999)}`;
      const [saved] = await db.insert(legalArticlesTable).values({
        title: data.title ?? "未命名文章",
        slug,
        summary: data.summary ?? null,
        content: data.content ?? null,
        category: data.category ?? null,
        country: data.country ?? null,
        coverImage: page.coverImage || null,
        isPublished: false,
        isFeatured: false,
      }).returning();
      succeeded.push({ url, id: saved.id, title: saved.title });
    } catch (e: any) {
      failed.push({ url, error: e?.message ?? String(e) });
    }
  }
  res.json({ succeeded, failed });
});

// ── Legal Documents ──────────────────────────────────────────────────────────

router.get("/legal-documents", async (req, res): Promise<void> => {
  const parsed = GetLegalDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { country, category, documentType, search, page, limit } = parsed.data;

  const conditions = [eq(legalDocumentsTable.isPublished, true)];
  if (country) conditions.push(eq(legalDocumentsTable.country, country));
  if (category) conditions.push(eq(legalDocumentsTable.category, category));
  if (documentType) conditions.push(eq(legalDocumentsTable.documentType, documentType));
  if (search) conditions.push(ilike(legalDocumentsTable.titleZh, `%${search}%`));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(legalDocumentsTable).where(where).limit(limit).offset(offset).orderBy(desc(legalDocumentsTable.createdAt)),
    db.select({ count: sql<number>`count(*)::int` }).from(legalDocumentsTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/legal-documents/:slug", async (req, res): Promise<void> => {
  const params = GetLegalDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db
    .select()
    .from(legalDocumentsTable)
    .where(eq(legalDocumentsTable.slug, params.data.slug));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc);
});

// AI: import legal document from URL
router.post("/admin/legal-documents/import-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Fetch the page
  let rawHtml: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeout);
    rawHtml = await response.text();
  } catch (err: any) {
    res.status(400).json({ error: `无法访问该链接: ${err?.message ?? err}` });
    return;
  }

  // Strip HTML — preserve block element structure with newlines
  const plainText = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(p|div|section|article|h[1-6]|li|br|tr|td|th|blockquote|pre|header|footer|main|aside)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 120000); // large enough for full legal documents

  const systemPrompt = `你是专业的法律文件全文提取与翻译助手，专门处理东盟国家法律条文。

任务：从以下网页内容中提取完整的法律条文全文，并翻译成三种语言。

要求：
1. contentZh / contentEn / contentLocal 必须包含法律条文的【完整全文】，不得截断或摘要。
2. 保留章节编号、条款编号（第一条、第二条……）、段落结构。
3. 翻译应逐条对应，不遗漏任何条款。
4. 根据所属国家判断当地语言：越南→Vietnamese，泰国→Thai，缅甸→Burmese，柬埔寨→Khmer，老挝→Lao，马来西亚→Malay，新加坡→English（如已是英文则直接复制），印度尼西亚→Indonesian，菲律宾→Filipino，文莱→Malay。

必须返回有效的 JSON 格式（不要加任何其他文字，不要加 markdown 代码块）：
{
  "titleZh": "法律条文完整中文标题",
  "titleEn": "Full English title",
  "titleLocal": "当地语言完整标题",
  "documentNumber": "文号/编号",
  "documentType": "文件类型（宪法/法律/法令/条例/决议/通知/协定/议定书/其他）",
  "country": "所属东盟国家（中文名：越南/泰国/缅甸/柬埔寨/老挝/马来西亚/新加坡/印度尼西亚/菲律宾/文莱）",
  "category": "法律领域（劳动法/税法/公司法/外商投资/移民/房产/知识产权/海关/刑法/民法/其他）",
  "issuingBody": "颁发机构",
  "issueDate": "颁布日期 YYYY-MM-DD，不知道则 null",
  "effectiveDate": "生效日期 YYYY-MM-DD，不知道则 null",
  "contentZh": "【完整条文全文中文翻译，保留所有条款编号和章节结构】",
  "contentEn": "【Full legal text in English, all articles preserved】",
  "contentLocal": "【完整当地语言原文或翻译，保留所有条款】",
  "tags": ["相关标签，最多8个"]
}`;

  let extracted: any;
  const callAI = async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 32768,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请从以下网页内容中提取法律条文完整全文并翻译：\n\n${plainText}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`AI 未返回有效 JSON (got: ${raw.slice(0, 200)})`);
    return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
  };
  try {
    extracted = await callAI();
  } catch (err: any) {
    try {
      extracted = await callAI();
    } catch (err2: any) {
      res.status(500).json({ error: `AI 提取失败: ${err2?.message ?? err2}` });
      return;
    }
  }

  res.json(extracted);
});

router.post("/admin/legal-documents", async (req, res): Promise<void> => {
  const parsed = CreateLegalDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { issueDate, effectiveDate, ...rest } = parsed.data;
  const [doc] = await db.insert(legalDocumentsTable).values({
    ...rest,
    issueDate: issueDate ? new Date(issueDate) : null,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
  }).returning();
  res.status(201).json(doc);
});

router.put("/admin/legal-documents/:id", async (req, res): Promise<void> => {
  const params = UpdateLegalDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLegalDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { issueDate, effectiveDate, ...rest } = parsed.data;
  const [doc] = await db
    .update(legalDocumentsTable)
    .set({
      ...rest,
      issueDate: issueDate ? new Date(issueDate) : null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
    })
    .where(eq(legalDocumentsTable.id, params.data.id))
    .returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc);
});

router.delete("/admin/legal-documents/:id", async (req, res): Promise<void> => {
  const params = DeleteLegalDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(legalDocumentsTable)
    .where(eq(legalDocumentsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
