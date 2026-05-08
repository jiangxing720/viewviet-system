import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import {
  GetWordsQueryParams,
  CreateWordBody,
  GetWordParams,
  DeleteWordParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/words", async (req, res): Promise<void> => {
  const parsed = GetWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { language_code, category, difficulty, search, page, limit } = parsed.data;

  const conditions = [eq(wordsTable.isPublished, true)];
  if (language_code) conditions.push(eq(wordsTable.languageCode, language_code));
  if (category) conditions.push(eq(wordsTable.category, category));
  if (difficulty) conditions.push(eq(wordsTable.difficulty, difficulty));
  if (search) conditions.push(ilike(wordsTable.word, `%${search}%`));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(wordsTable).where(where).limit(limit).offset(offset).orderBy(wordsTable.createdAt),
    db.select({ count: sql<number>`count(*)::int` }).from(wordsTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

router.get("/words/categories", async (_req, res): Promise<void> => {
  const result = await db
    .selectDistinct({ category: wordsTable.category })
    .from(wordsTable)
    .where(and(eq(wordsTable.isPublished, true), sql`${wordsTable.category} IS NOT NULL`));
  res.json(result.map((r) => r.category).filter(Boolean));
});

router.get("/words/:id", async (req, res): Promise<void> => {
  const params = GetWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [word] = await db.select().from(wordsTable).where(eq(wordsTable.id, params.data.id));
  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.json(word);
});

router.post("/admin/words", async (req, res): Promise<void> => {
  const parsed = CreateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [word] = await db.insert(wordsTable).values(parsed.data).returning();
  res.status(201).json(word);
});

router.delete("/admin/words/:id", async (req, res): Promise<void> => {
  const params = DeleteWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(wordsTable).where(eq(wordsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
