import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const travelGuidesTable = pgTable("travel_guides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleLocal: text("title_local"),
  titleEn: text("title_en"),
  country: text("country"),
  city: text("city"),
  category: text("category"),
  content: text("content"),
  coverImage: text("cover_image"),
  budgetRange: text("budget_range"),
  mapEmbed: text("map_embed"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTravelGuideSchema = createInsertSchema(travelGuidesTable).omit({ id: true, viewCount: true, createdAt: true });
export type InsertTravelGuide = z.infer<typeof insertTravelGuideSchema>;
export type TravelGuide = typeof travelGuidesTable.$inferSelect;
