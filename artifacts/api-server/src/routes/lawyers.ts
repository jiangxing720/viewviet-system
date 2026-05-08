import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, lawyersTable } from "@workspace/db";
import {
  GetLawyersQueryParams,
  CreateLawyerBody,
  GetLawyerParams,
  UpdateLawyerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/lawyers", async (req, res): Promise<void> => {
  const parsed = GetLawyersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { country, city, search } = parsed.data;

  const conditions = [eq(lawyersTable.isActive, true)];
  if (country) conditions.push(eq(lawyersTable.country, country));
  if (city) conditions.push(eq(lawyersTable.city, city));
  if (search) conditions.push(ilike(lawyersTable.name, `%${search}%`));

  const data = await db
    .select()
    .from(lawyersTable)
    .where(and(...conditions))
    .orderBy(lawyersTable.name);
  res.json(data);
});

router.get("/lawyers/featured", async (_req, res): Promise<void> => {
  const data = await db
    .select()
    .from(lawyersTable)
    .where(and(eq(lawyersTable.isActive, true), eq(lawyersTable.isFeatured, true)))
    .limit(6);
  res.json(data);
});

router.get("/lawyers/:id", async (req, res): Promise<void> => {
  const params = GetLawyerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, params.data.id));
  if (!lawyer) {
    res.status(404).json({ error: "Lawyer not found" });
    return;
  }
  res.json(lawyer);
});

router.post("/admin/lawyers", async (req, res): Promise<void> => {
  const parsed = CreateLawyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [lawyer] = await db.insert(lawyersTable).values(parsed.data).returning();
  res.status(201).json(lawyer);
});

router.put("/admin/lawyers/:id", async (req, res): Promise<void> => {
  const params = UpdateLawyerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLawyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [lawyer] = await db
    .update(lawyersTable)
    .set(parsed.data)
    .where(eq(lawyersTable.id, params.data.id))
    .returning();
  if (!lawyer) {
    res.status(404).json({ error: "Lawyer not found" });
    return;
  }
  res.json(lawyer);
});

export default router;
