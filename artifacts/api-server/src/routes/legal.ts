import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc, ne } from "drizzle-orm";
import { db, legalArticlesTable } from "@workspace/db";
import {
  GetLegalArticlesQueryParams,
  CreateLegalArticleBody,
  GetLegalArticleParams,
  GetRelatedLegalArticlesParams,
  UpdateLegalArticleParams,
  DeleteLegalArticleParams,
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

export default router;
