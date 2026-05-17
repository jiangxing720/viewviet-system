import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
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
  if (language_code) conditions.push(eq(sql`LOWER(${sceneSentencesTable.languageCode})`, language_code.toLowerCase()));
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

router.get("/scene-sentences/scenes", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const conditions = [eq(sceneSentencesTable.isPublished, true)];
  if (language_code) conditions.push(eq(sql`LOWER(${sceneSentencesTable.languageCode})`, language_code.toLowerCase()));
  const result = await db
    .selectDistinct({ sceneName: sceneSentencesTable.sceneName })
    .from(sceneSentencesTable)
    .where(and(...conditions));
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
  if (language_code) conditions.push(eq(sql`LOWER(${complexSentencesTable.languageCode})`, language_code.toLowerCase()));
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

router.post("/admin/scene-sentences/bulk", async (req, res): Promise<void> => {
  const { rows } = req.body as { rows: unknown[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }
  const valid: any[] = [];
  const errors: { index: number; error: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    if (!row?.sentence || typeof row.sentence !== "string" || !row.sentence.trim()) {
      errors.push({ index: i, error: "sentence is required" });
      continue;
    }
    if (!row?.sceneName || typeof row.sceneName !== "string" || !row.sceneName.trim()) {
      errors.push({ index: i, error: "sceneName is required" });
      continue;
    }
    valid.push({
      sentence: row.sentence.trim(),
      languageCode: (row.languageCode ?? "vi").toLowerCase(),
      sceneName: row.sceneName.trim(),
      pronunciation: row.pronunciation || null,
      translationZh: row.translationZh || null,
      translationEn: row.translationEn || null,
      translationVi: row.translationVi || null,
      difficulty: Math.min(5, Math.max(1, Number(row.difficulty) || 1)),
      isPublished: row.isPublished === true || row.isPublished === "true",
    });
  }
  if (valid.length === 0) {
    res.status(400).json({ error: "No valid rows", errors });
    return;
  }
  const inserted = await db.insert(sceneSentencesTable).values(valid).returning();
  res.status(201).json({ inserted: inserted.length, errors });
});

router.post("/admin/complex-sentences/bulk", async (req, res): Promise<void> => {
  const { rows } = req.body as { rows: unknown[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }
  const valid: any[] = [];
  const errors: { index: number; error: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    if (!row?.sentence || typeof row.sentence !== "string" || !row.sentence.trim()) {
      errors.push({ index: i, error: "sentence is required" });
      continue;
    }
    valid.push({
      sentence: row.sentence.trim(),
      languageCode: (row.languageCode ?? "vi").toLowerCase(),
      pronunciation: row.pronunciation || null,
      translationZh: row.translationZh || null,
      translationEn: row.translationEn || null,
      translationVi: row.translationVi || null,
      grammarNotes: row.grammarNotes || null,
      context: row.context || null,
      difficulty: Math.min(5, Math.max(1, Number(row.difficulty) || 1)),
      isPublished: row.isPublished === true || row.isPublished === "true",
    });
  }
  if (valid.length === 0) {
    res.status(400).json({ error: "No valid rows", errors });
    return;
  }
  const inserted = await db.insert(complexSentencesTable).values(valid).returning();
  res.status(201).json({ inserted: inserted.length, errors });
});

// ── Admin list endpoints (all, including drafts) ─────────────────────────────

router.get("/admin/scene-sentences", async (req, res): Promise<void> => {
  const { language_code, scene_name, search, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, Number(pageStr) || 1);
  const limit = Math.min(200, Math.max(1, Number(limitStr) || 50));
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (language_code) conditions.push(eq(sql`LOWER(${sceneSentencesTable.languageCode})`, language_code.toLowerCase()));
  if (scene_name) conditions.push(eq(sceneSentencesTable.sceneName, scene_name));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(sceneSentencesTable).where(where).limit(limit).offset(offset).orderBy(sceneSentencesTable.id),
    db.select({ count: sql<number>`count(*)::int` }).from(sceneSentencesTable).where(where),
  ]);
  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/admin/complex-sentences", async (req, res): Promise<void> => {
  const { language_code, context, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, Number(pageStr) || 1);
  const limit = Math.min(200, Math.max(1, Number(limitStr) || 50));
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (language_code) conditions.push(eq(sql`LOWER(${complexSentencesTable.languageCode})`, language_code.toLowerCase()));
  if (context) conditions.push(eq(complexSentencesTable.context, context));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(complexSentencesTable).where(where).limit(limit).offset(offset).orderBy(complexSentencesTable.id),
    db.select({ count: sql<number>`count(*)::int` }).from(complexSentencesTable).where(where),
  ]);
  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get("/admin/scene-sentences/scenes", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const conditions: any[] = [];
  if (language_code) conditions.push(eq(sql`LOWER(${sceneSentencesTable.languageCode})`, language_code.toLowerCase()));
  const result = await db
    .selectDistinct({ sceneName: sceneSentencesTable.sceneName })
    .from(sceneSentencesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sceneSentencesTable.sceneName);
  res.json(result.map((r) => r.sceneName).filter(Boolean));
});

// ── Admin bulk delete ─────────────────────────────────────────────────────────

router.post("/admin/scene-sentences/bulk-delete", async (req, res): Promise<void> => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }
  const deleted = await db.delete(sceneSentencesTable).where(inArray(sceneSentencesTable.id, ids)).returning({ id: sceneSentencesTable.id });
  res.json({ deleted: deleted.length });
});

router.post("/admin/complex-sentences/bulk-delete", async (req, res): Promise<void> => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }
  const deleted = await db.delete(complexSentencesTable).where(inArray(complexSentencesTable.id, ids)).returning({ id: complexSentencesTable.id });
  res.json({ deleted: deleted.length });
});

// ── Admin delete duplicates ───────────────────────────────────────────────────

router.delete("/admin/scene-sentences/duplicates", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const whereClause = language_code ? `WHERE language_code = '${language_code}'` : "";
  const result = await db.execute(sql.raw(`
    DELETE FROM scene_sentences
    WHERE id NOT IN (
      SELECT MIN(id) FROM scene_sentences ${whereClause} GROUP BY LOWER(sentence), language_code, scene_name
    )
    ${whereClause}
    RETURNING id
  `));
  const count = (result as any).rowCount ?? (result as any).rows?.length ?? 0;
  res.json({ deleted: count });
});

router.delete("/admin/complex-sentences/duplicates", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const whereClause = language_code ? `WHERE language_code = '${language_code}'` : "";
  const result = await db.execute(sql.raw(`
    DELETE FROM complex_sentences
    WHERE id NOT IN (
      SELECT MIN(id) FROM complex_sentences ${whereClause} GROUP BY LOWER(sentence), language_code
    )
    ${whereClause}
    RETURNING id
  `));
  const count = (result as any).rowCount ?? (result as any).rows?.length ?? 0;
  res.json({ deleted: count });
});

// ── Admin delete by filter ────────────────────────────────────────────────────

router.delete("/admin/scene-sentences/by-filter", async (req, res): Promise<void> => {
  const { language_code, scene_name } = req.query as { language_code?: string; scene_name?: string };
  if (!language_code && !scene_name) {
    res.status(400).json({ error: "At least language_code or scene_name is required" });
    return;
  }
  const conditions: any[] = [];
  if (language_code) conditions.push(eq(sql`LOWER(${sceneSentencesTable.languageCode})`, language_code.toLowerCase()));
  if (scene_name) conditions.push(eq(sceneSentencesTable.sceneName, scene_name));
  const deleted = await db.delete(sceneSentencesTable).where(and(...conditions)).returning({ id: sceneSentencesTable.id });
  res.json({ deleted: deleted.length });
});

router.delete("/admin/complex-sentences/by-filter", async (req, res): Promise<void> => {
  const { language_code, context } = req.query as { language_code?: string; context?: string };
  if (!language_code) {
    res.status(400).json({ error: "language_code is required" });
    return;
  }
  const conditions: any[] = [eq(sql`LOWER(${complexSentencesTable.languageCode})`, language_code.toLowerCase())];
  if (context) conditions.push(eq(complexSentencesTable.context, context));
  const deleted = await db.delete(complexSentencesTable).where(and(...conditions)).returning({ id: complexSentencesTable.id });
  res.json({ deleted: deleted.length });
});

export default router;
