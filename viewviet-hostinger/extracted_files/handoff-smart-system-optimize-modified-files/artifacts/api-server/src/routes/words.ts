import { Router, type IRouter } from "express";
import { eq, ilike, and, or, inArray, sql } from "drizzle-orm";
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
  if (language_code) conditions.push(eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase()));
  if (category) conditions.push(eq(wordsTable.category, category));
  if (difficulty) conditions.push(eq(wordsTable.difficulty, difficulty));
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(wordsTable.word, like),
        ilike(wordsTable.pronunciation, like),
        ilike(wordsTable.meaningZh, like),
        ilike(wordsTable.meaningEn, like),
        ilike(wordsTable.meaningVi, like),
        ilike(wordsTable.exampleSentence, like),
        ilike(wordsTable.exampleTranslation, like),
      )!
    );
  }

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

router.get("/words/categories", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const baseWhere = and(eq(wordsTable.isPublished, true), sql`${wordsTable.category} IS NOT NULL`);
  const where = language_code
    ? and(baseWhere, eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase()))
    : baseWhere;
  const result = await db
    .selectDistinct({ category: wordsTable.category })
    .from(wordsTable)
    .where(where);
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

router.put("/admin/words/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateWordBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [word] = await db.update(wordsTable).set(parsed.data).where(eq(wordsTable.id, id)).returning();
  if (!word) { res.status(404).json({ error: "Word not found" }); return; }
  res.json(word);
});

// Admin: list ALL words (including drafts) with pagination
router.get("/admin/words", async (req, res): Promise<void> => {
  const { language_code, category, search, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, Number(pageStr) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitStr) || 50));
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (language_code) conditions.push(eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase()));
  if (category) conditions.push(eq(wordsTable.category, category));
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(wordsTable.word, like),
        ilike(wordsTable.pronunciation, like),
        ilike(wordsTable.meaningZh, like),
        ilike(wordsTable.meaningEn, like),
        ilike(wordsTable.meaningVi, like),
        ilike(wordsTable.exampleSentence, like),
        ilike(wordsTable.exampleTranslation, like),
      )!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(wordsTable).where(where).limit(limit).offset(offset).orderBy(wordsTable.id),
    db.select({ count: sql<number>`count(*)::int` }).from(wordsTable).where(where),
  ]);
  const total = countResult[0]?.count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Admin: get categories for admin (includes drafts)
router.get("/admin/words/categories", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  const conditions: any[] = [sql`category IS NOT NULL`];
  if (language_code) conditions.push(eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase()));
  const result = await db
    .selectDistinct({ category: wordsTable.category })
    .from(wordsTable)
    .where(and(...conditions))
    .orderBy(wordsTable.category);
  res.json(result.map((r) => r.category).filter(Boolean));
});

// Admin: bulk delete by IDs
router.post("/admin/words/bulk-delete", async (req, res): Promise<void> => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }
  const deleted = await db.delete(wordsTable).where(inArray(wordsTable.id, ids)).returning({ id: wordsTable.id });
  res.json({ deleted: deleted.length });
});

// Admin: delete duplicate words
// Duplicates = same word (case-insensitive) + same language_code + same example_sentence
// Words with different example sentences are kept even if the word text is identical.
router.delete("/admin/words/duplicates", async (req, res): Promise<void> => {
  const { language_code } = req.query as { language_code?: string };
  try {
    let result: any;
    if (language_code) {
      const lang = language_code.toLowerCase();
      result = await db.execute(
        sql`DELETE FROM words
            WHERE LOWER(language_code) = ${lang}
              AND id NOT IN (
                SELECT MIN(id)
                FROM words
                WHERE LOWER(language_code) = ${lang}
                GROUP BY LOWER(word), LOWER(language_code), LOWER(COALESCE(example_sentence, ''))
              )
            RETURNING id`
      );
    } else {
      result = await db.execute(
        sql`DELETE FROM words
            WHERE id NOT IN (
              SELECT MIN(id)
              FROM words
              GROUP BY LOWER(word), LOWER(language_code), LOWER(COALESCE(example_sentence, ''))
            )
            RETURNING id`
      );
    }
    const count = (result as any).rowCount ?? (result as any).rows?.length ?? 0;
    res.json({ deleted: count });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Internal error" });
  }
});


// Admin: delete words by filter (language + optional category)
router.delete("/admin/words/by-filter", async (req, res): Promise<void> => {
  const { language_code, category } = req.query as { language_code?: string; category?: string };
  if (!language_code) {
    res.status(400).json({ error: "language_code is required" });
    return;
  }
  const conditions: any[] = [eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase())];
  if (category) conditions.push(eq(wordsTable.category, category));
  const deleted = await db.delete(wordsTable).where(and(...conditions)).returning({ id: wordsTable.id });
  res.json({ deleted: deleted.length });
});

// Admin: batch rename a category across all words for a language
router.post("/admin/words/rename-category", async (req, res): Promise<void> => {
  const { language_code, oldCategory, newCategory } = req.body as {
    language_code?: string;
    oldCategory?: string;
    newCategory?: string;
  };
  if (!oldCategory?.trim() || !newCategory?.trim()) {
    res.status(400).json({ error: "oldCategory and newCategory are required" });
    return;
  }
  const conditions: any[] = [eq(wordsTable.category, oldCategory.trim())];
  if (language_code) {
    conditions.push(eq(sql`LOWER(${wordsTable.languageCode})`, language_code.toLowerCase()));
  }
  const updated = await db
    .update(wordsTable)
    .set({ category: newCategory.trim() })
    .where(and(...conditions))
    .returning({ id: wordsTable.id });
  res.json({ updated: updated.length });
});


router.post("/admin/words/bulk", async (req, res): Promise<void> => {
  const { rows, overwrite = false } = req.body as { rows: unknown[]; overwrite?: boolean };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }

  const valid: any[] = [];
  const errors: { index: number; error: string }[] = [];
  const skipped: { index: number; word: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    if (!row?.word || typeof row.word !== "string" || !row.word.trim()) {
      errors.push({ index: i, error: "word is required" });
      continue;
    }
    valid.push({
      index: i,
      word: row.word.trim(),
      languageCode: (row.languageCode ?? "vi").toLowerCase(),
      pronunciation: row.pronunciation || null,
      meaningZh: row.meaningZh || null,
      meaningEn: row.meaningEn || null,
      meaningVi: row.meaningVi || null,
      category: row.category || null,
      exampleSentence: row.exampleSentence || null,
      exampleTranslation: row.exampleTranslation || null,
      difficulty: Math.min(5, Math.max(1, Number(row.difficulty) || 1)),
      isPublished: row.isPublished === true || row.isPublished === "true",
    });
  }

  if (valid.length === 0) {
    res.status(400).json({ error: "No valid rows", errors });
    return;
  }

  // Fetch existing words; dedup key = languageCode + word + exampleSentence
  // If same word exists but with a DIFFERENT example sentence → treat as NEW (not a duplicate)
  const langCodes = [...new Set(valid.map((r) => r.languageCode))];
  const existing = await db
    .select({ id: wordsTable.id, word: wordsTable.word, languageCode: wordsTable.languageCode, exampleSentence: wordsTable.exampleSentence })
    .from(wordsTable)
    .where(
      langCodes.length === 1
        ? eq(sql`LOWER(${wordsTable.languageCode})`, langCodes[0]!)
        : sql`LOWER(${wordsTable.languageCode}) = ANY(${sql.raw(`ARRAY[${langCodes.map(l => `'${l}'`).join(",'")}]`)})`,
    );

  // Map: "langcode::lower(word)::lower(exampleSentence)" -> existing row id
  const makeKey = (lang: string, word: string, ex: string | null | undefined) =>
    `${lang.toLowerCase()}::${word.toLowerCase()}::${(ex ?? "").toLowerCase().trim()}`;

  const existingMap = new Map(
    existing.map((e) => [makeKey(e.languageCode, e.word, e.exampleSentence), e.id])
  );

  const toInsert: any[] = [];
  const toUpdate: Array<{ id: number; data: any }> = [];
  // Track keys processed in this batch to avoid intra-batch exact duplicates
  const batchKeys = new Set<string>();

  for (const row of valid) {
    const key = makeKey(row.languageCode, row.word, row.exampleSentence);
    if (batchKeys.has(key)) {
      skipped.push({ index: row.index, word: row.word, reason: "duplicate in batch" });
      continue;
    }
    batchKeys.add(key);

    const existingId = existingMap.get(key);
    const { index: _i, ...data } = row;

    if (existingId !== undefined) {
      if (overwrite) {
        toUpdate.push({ id: existingId, data });
      } else {
        skipped.push({ index: row.index, word: row.word, reason: "duplicate" });
      }
    } else {
      toInsert.push(data);
    }
  }

  let insertedCount = 0;
  let updatedCount = 0;

  if (toInsert.length > 0) {
    const inserted = await db.insert(wordsTable).values(toInsert).returning();
    insertedCount = inserted.length;
  }

  // Process updates one by one (drizzle doesn't support bulk update with different values per row)
  for (const { id, data } of toUpdate) {
    await db.update(wordsTable).set(data).where(eq(wordsTable.id, id));
    updatedCount++;
  }

  res.status(201).json({
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skipped.length,
    skippedWords: skipped,
    errors,
  });
});

// Admin: single delete by id — MUST be after all specific /admin/words/* routes
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
