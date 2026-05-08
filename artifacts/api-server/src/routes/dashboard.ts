import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, wordsTable, legalArticlesTable, travelGuidesTable, lawyersTable, activitiesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [
    wordCount,
    articleCount,
    guideCount,
    lawyerCount,
    activityCount,
    pendingCount,
    recentWords,
    recentArticles,
    categoryBreakdown,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(wordsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(legalArticlesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(travelGuidesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(lawyersTable).where(eq(lawyersTable.isActive, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(activitiesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(activitiesTable).where(eq(activitiesTable.isPublished, false)),
    db.select().from(wordsTable).orderBy(desc(wordsTable.createdAt)).limit(5),
    db.select().from(legalArticlesTable).orderBy(desc(legalArticlesTable.createdAt)).limit(5),
    db
      .select({ category: legalArticlesTable.category, count: sql<number>`count(*)::int` })
      .from(legalArticlesTable)
      .where(and(eq(legalArticlesTable.isPublished, true), sql`${legalArticlesTable.category} IS NOT NULL`))
      .groupBy(legalArticlesTable.category)
      .limit(8),
  ]);

  res.json({
    totalWords: wordCount[0]?.count ?? 0,
    totalLegalArticles: articleCount[0]?.count ?? 0,
    totalTravelGuides: guideCount[0]?.count ?? 0,
    totalLawyers: lawyerCount[0]?.count ?? 0,
    totalActivities: activityCount[0]?.count ?? 0,
    pendingActivities: pendingCount[0]?.count ?? 0,
    recentWords,
    recentLegalArticles: recentArticles,
    contentByCategory: categoryBreakdown.map((r) => ({ category: r.category ?? "Other", count: r.count })),
  });
});

export default router;
