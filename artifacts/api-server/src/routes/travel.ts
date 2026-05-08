import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, travelGuidesTable } from "@workspace/db";
import {
  GetTravelGuidesQueryParams,
  CreateTravelGuideBody,
  GetTravelGuideParams,
  UpdateTravelGuideParams,
  DeleteTravelGuideParams,
} from "@workspace/api-zod";

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

export default router;
