import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sceneSentencesTable = pgTable("scene_sentences", {
  id: serial("id").primaryKey(),
  languageCode: text("language_code").notNull(),
  sceneName: text("scene_name").notNull(),
  sentence: text("sentence").notNull(),
  pronunciation: text("pronunciation"),
  translationZh: text("translation_zh"),
  translationEn: text("translation_en"),
  translationVi: text("translation_vi"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  difficulty: integer("difficulty"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSceneSentenceSchema = createInsertSchema(sceneSentencesTable).omit({ id: true, createdAt: true });
export type InsertSceneSentence = z.infer<typeof insertSceneSentenceSchema>;
export type SceneSentence = typeof sceneSentencesTable.$inferSelect;

export const complexSentencesTable = pgTable("complex_sentences", {
  id: serial("id").primaryKey(),
  languageCode: text("language_code").notNull(),
  sentence: text("sentence").notNull(),
  pronunciation: text("pronunciation"),
  translationZh: text("translation_zh"),
  translationEn: text("translation_en"),
  translationVi: text("translation_vi"),
  grammarNotes: text("grammar_notes"),
  context: text("context"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  difficulty: integer("difficulty"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertComplexSentenceSchema = createInsertSchema(complexSentencesTable).omit({ id: true, createdAt: true });
export type InsertComplexSentence = z.infer<typeof insertComplexSentenceSchema>;
export type ComplexSentence = typeof complexSentencesTable.$inferSelect;
