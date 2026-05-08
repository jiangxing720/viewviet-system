import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const legalArticlesTable = pgTable("legal_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleVn: text("title_vn"),
  titleEn: text("title_en"),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  summary: text("summary"),
  category: text("category"),
  country: text("country"),
  tags: text("tags").array(),
  coverImage: text("cover_image"),
  videoUrl: text("video_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLegalArticleSchema = createInsertSchema(legalArticlesTable).omit({ id: true, viewCount: true, createdAt: true });
export type InsertLegalArticle = z.infer<typeof insertLegalArticleSchema>;
export type LegalArticle = typeof legalArticlesTable.$inferSelect;
