import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lawyersTable = pgTable("lawyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameVi: text("name_vi"),
  title: text("title"),
  lawFirm: text("law_firm"),
  country: text("country"),
  city: text("city"),
  photo: text("photo"),
  bio: text("bio"),
  bioEn: text("bio_en"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  wechat: text("wechat"),
  specialties: text("specialties").array(),
  languages: text("languages").array(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLawyerSchema = createInsertSchema(lawyersTable).omit({ id: true, createdAt: true });
export type InsertLawyer = z.infer<typeof insertLawyerSchema>;
export type Lawyer = typeof lawyersTable.$inferSelect;
