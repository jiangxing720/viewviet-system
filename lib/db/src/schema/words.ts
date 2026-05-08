import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wordsTable = pgTable("words", {
  id: serial("id").primaryKey(),
  languageCode: text("language_code").notNull(),
  word: text("word").notNull(),
  pronunciation: text("pronunciation"),
  meaningZh: text("meaning_zh"),
  meaningEn: text("meaning_en"),
  meaningVi: text("meaning_vi"),
  category: text("category"),
  sceneTag: text("scene_tag"),
  audioUrl: text("audio_url"),
  imageUrl: text("image_url"),
  exampleSentence: text("example_sentence"),
  exampleTranslation: text("example_translation"),
  difficulty: integer("difficulty"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWordSchema = createInsertSchema(wordsTable).omit({ id: true, createdAt: true });
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof wordsTable.$inferSelect;
