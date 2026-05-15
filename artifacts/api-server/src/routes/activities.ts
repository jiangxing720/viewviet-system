import { Router, type IRouter } from "express";
import { eq, and, sql, gte } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import {
  GetActivitiesQueryParams,
  CreateActivityBody,
  GetActivityParams,
  ApproveActivityParams,
  RejectActivityParams,
  DeleteActivityParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activities", async (req, res): Promise<void> => {
  const parsed = GetActivitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, upcoming } = parsed.data;

  const conditions = [eq(activitiesTable.isPublished, true)];
  if (category) conditions.push(eq(activitiesTable.category, category));
  if (upcoming) conditions.push(gte(activitiesTable.startTime, new Date()));

  const data = await db
    .select()
    .from(activitiesTable)
    .where(and(...conditions))
    .orderBy(activitiesTable.startTime);
  res.json(data);
});

router.get("/activities/:id", async (req, res): Promise<void> => {
  const params = GetActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, params.data.id));
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { startTime, endTime, ...activityRest } = parsed.data;
  const [activity] = await db
    .insert(activitiesTable)
    .values({
      ...activityRest,
      isPublished: false,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
    })
    .returning();
  res.status(201).json(activity);
});

router.post("/activities/:id/join", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid activity id" });
    return;
  }
  const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, id));
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  if (!activity.isPublished) {
    res.status(400).json({ error: "Activity not available" });
    return;
  }
  if (activity.maxParticipants && activity.currentParticipants >= activity.maxParticipants) {
    res.status(409).json({ error: "Activity is full" });
    return;
  }
  const [updated] = await db
    .update(activitiesTable)
    .set({ currentParticipants: sql`${activitiesTable.currentParticipants} + 1` })
    .where(eq(activitiesTable.id, id))
    .returning();
  res.json(updated);
});

router.put("/admin/activities/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [activity] = await db
    .update(activitiesTable)
    .set({ isPublished: true })
    .where(eq(activitiesTable.id, params.data.id))
    .returning();
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

router.put("/admin/activities/:id/reject", async (req, res): Promise<void> => {
  const params = RejectActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [activity] = await db
    .update(activitiesTable)
    .set({ isPublished: false })
    .where(eq(activitiesTable.id, params.data.id))
    .returning();
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

router.delete("/admin/activities/:id", async (req, res): Promise<void> => {
  const params = DeleteActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(activitiesTable)
    .where(eq(activitiesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
