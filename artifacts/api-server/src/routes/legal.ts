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
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ViewViet-Bot/1.0)" },
    });
    clearTimeout(timeout);
    rawHtml = await response.text();
  } catch (err: any) {
    res.status(400).json({ error: `无法访问该链接: ${err?.message ?? err}` });
    return;
  }

  // Strip HTML tags, collapse whitespace, limit length
  const plainText = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 12000);

  const systemPrompt = `你是专业的法律文件信息提取助手，帮助从网页文字中识别并提取东盟国家的法律条文信息。
请根据提供的网页内容，提取法律文件的结构化数据，并将相关内容翻译成中文、英文和当地语言（根据所属国家判断：越南→Vietnamese，泰国→Thai，缅甸→Burmese，柬埔寨→Khmer，老挝→Lao，马来西亚→Malay，新加坡→English，印度尼西亚→Indonesian，菲律宾→Filipino，文莱→Malay）。

必须返回有效的 JSON 格式，包含以下字段（所有字段都可为 null 如果找不到对应信息）：
{
  "titleZh": "法律条文中文标题",
  "titleEn": "English title",
  "titleLocal": "当地语言标题",
  "documentNumber": "文号/编号",
  "documentType": "文件类型（宪法/法律/法令/条例/决议/通知/协定/议定书/其他）",
  "country": "所属东盟国家（中文名：越南/泰国/缅甸/柬埔寨/老挝/马来西亚/新加坡/印度尼西亚/菲律宾/文莱）",
  "category": "法律领域（劳动法/税法/公司法/外商投资/移民/房产/知识产权/海关/刑法/民法/其他）",
  "issuingBody": "颁发机构",
  "issueDate": "颁布日期 YYYY-MM-DD 格式，如不知道则 null",
  "effectiveDate": "生效日期 YYYY-MM-DD 格式，如不知道则 null",
  "contentZh": "条文主要内容的中文摘要或翻译（500字以内）",
  "contentEn": "Main content summary in English (within 500 words)",
  "contentLocal": "当地语言摘要（500词以内）",
  "tags": ["相关标签数组，最多5个"]
}
只返回 JSON，不要加任何其他文字。`;

  let extracted: any;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请从以下网页内容中提取法律条文信息：\n\n${plainText}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 未返回有效 JSON");
    extracted = JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    res.status(500).json({ error: `AI 提取失败: ${err?.message ?? err}` });
    return;
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
