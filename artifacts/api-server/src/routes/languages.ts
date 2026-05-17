import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/languages", async (req, res): Promise<void> => {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "learn_languages"));
  if (setting && setting.value) {
    try {
      res.json(JSON.parse(setting.value));
      return;
    } catch {}
  }
  // Default languages
  res.json([
    { code: "vi", label: "越南语", sublabel: "Tiếng Việt", photo: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&auto=format&fit=crop", accent: "#f59e0b", enabled: true },
    { code: "en", label: "英语", sublabel: "English", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&auto=format&fit=crop", accent: "#3b82f6", enabled: true },
    { code: "zh", label: "中文", sublabel: "普通话", photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80&auto=format&fit=crop", accent: "#ef4444", enabled: true },
    { code: "ko", label: "韩语", sublabel: "한국어", photo: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80&auto=format&fit=crop", accent: "#8b5cf6", enabled: true },
  ]);
});

router.post("/admin/languages", async (req, res): Promise<void> => {
  const { languages } = req.body as { languages: any[] };
  const value = JSON.stringify(languages);
  
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "learn_languages"));
  if (existing) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, "learn_languages"));
  } else {
    await db.insert(siteSettingsTable).values({
      key: "learn_languages",
      value,
      section: "general",
      label: "Learning Languages",
      fieldType: "json"
    });
  }
  
  res.json({ success: true });
});

export default router;
