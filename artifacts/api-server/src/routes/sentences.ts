import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, sceneSentencesTable, complexSentencesTable } from "@workspace/db";
import {
  GetSceneSentencesQueryParams,
  CreateSceneSentenceBody,
  GetComplexSentencesQueryParams,
  CreateComplexSentenceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Scene sentences
router.get("/scene-sentences", async (req, res): Promise<void> => {
  const parsed = GetSceneSentencesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { language_code, scene_name, difficulty, page, limit } = parsed.data;

  const conditions = [eq(sceneSentencesTable.isPublished, true)];
  if (language_code) conditions.push(eq(sceneSentencesTable.languageCode, language_code));
  if (scene_name) conditions.push(eq(sceneSentencesTable.sceneName, scene_name));
  if (difficulty) conditions.push(eq(sceneSentencesTable.difficulty, difficulty));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(sceneSentencesTable).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(sceneSentencesTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/scene-sentences/scenes", async (_req, res): Promise<void> => {
  const result = await db
    .selectDistinct({ sceneName: sceneSentencesTable.sceneName })
    .from(sceneSentencesTable)
    .where(eq(sceneSentencesTable.isPublished, true));
  res.json(result.map((r) => r.sceneName));
});

router.post("/admin/scene-sentences", async (req, res): Promise<void> => {
  const parsed = CreateSceneSentenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sentence] = await db.insert(sceneSentencesTable).values(parsed.data).returning();
  res.status(201).json(sentence);
});

// Complex sentences
router.get("/complex-sentences", async (req, res): Promise<void> => {
  const parsed = GetComplexSentencesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { language_code, difficulty, context, page, limit } = parsed.data;

  const conditions = [eq(complexSentencesTable.isPublished, true)];
  if (language_code) conditions.push(eq(complexSentencesTable.languageCode, language_code));
  if (difficulty) conditions.push(eq(complexSentencesTable.difficulty, difficulty));
  if (context) conditions.push(eq(complexSentencesTable.context, context));

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(complexSentencesTable).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(complexSentencesTable).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.post("/admin/complex-sentences", async (req, res): Promise<void> => {
  const parsed = CreateComplexSentenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sentence] = await db.insert(complexSentencesTable).values(parsed.data).returning();
  res.status(201).json(sentence);
});

export default router;
