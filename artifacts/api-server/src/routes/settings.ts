import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  section: string;
  label: string;
  description?: string;
  fieldType: string;
  sortOrder: number;
}> = [
  // ── Homepage ───────────────────────────────────────────────────────────────
  { key: "home.hero_badge", value: "中越跨境生活平台", section: "homepage", label: "Hero 徽标文字", fieldType: "text", sortOrder: 10 },
  { key: "home.hero_bg_image", value: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600", section: "homepage", label: "Hero 背景图片 URL", fieldType: "url", sortOrder: 11 },
  { key: "home.hero_title_zh", value: "探索越南，连接东南亚", section: "homepage", label: "Hero 主标题（中文）", fieldType: "text", sortOrder: 12 },
  { key: "home.hero_subtitle_zh", value: "您的跨境内容平台——越南语学习、旅行攻略、法律资讯，一站搞定", section: "homepage", label: "Hero 副标题（中文）", fieldType: "textarea", sortOrder: 13 },
  { key: "home.hero_title_en", value: "Explore Vietnam, Connect Southeast Asia", section: "homepage", label: "Hero 主标题（英文）", fieldType: "text", sortOrder: 14 },
  { key: "home.hero_subtitle_en", value: "Your cross-border content hub for language, travel, legal and community", section: "homepage", label: "Hero 副标题（英文）", fieldType: "textarea", sortOrder: 15 },
  { key: "home.hero_title_vi", value: "Khám phá Việt Nam, Kết nối Đông Nam Á", section: "homepage", label: "Hero 主标题（越文）", fieldType: "text", sortOrder: 16 },
  { key: "home.hero_subtitle_vi", value: "Nền tảng nội dung xuyên biên giới dành cho người nước ngoài", section: "homepage", label: "Hero 副标题（越文）", fieldType: "textarea", sortOrder: 17 },
  { key: "home.hero_cta_primary_label", value: "开始学习", section: "homepage", label: "Hero 主按钮文字", fieldType: "text", sortOrder: 18 },
  { key: "home.hero_cta_primary_url", value: "/learn", section: "homepage", label: "Hero 主按钮跳转链接", fieldType: "text", sortOrder: 19 },
  { key: "home.hero_cta_secondary_label", value: "旅行攻略", section: "homepage", label: "Hero 次按钮文字", fieldType: "text", sortOrder: 20 },
  { key: "home.hero_cta_secondary_url", value: "/guides", section: "homepage", label: "Hero 次按钮跳转链接", fieldType: "text", sortOrder: 21 },
  // Section headings
  { key: "home.section_guides_title", value: "精选旅行攻略", section: "homepage", label: "板块标题：旅行攻略", fieldType: "text", sortOrder: 30 },
  { key: "home.section_legal_title", value: "法律资讯", section: "homepage", label: "板块标题：法律资讯", fieldType: "text", sortOrder: 31 },
  { key: "home.section_lawyers_title", value: "推荐律师", section: "homepage", label: "板块标题：推荐律师", fieldType: "text", sortOrder: 32 },
  { key: "home.section_activities_title", value: "近期活动", section: "homepage", label: "板块标题：近期活动", fieldType: "text", sortOrder: 33 },
  // Module cards
  { key: "home.module_vietnamese_label", value: "越南语学习", section: "homepage", label: "模块卡：越南语标题", fieldType: "text", sortOrder: 40 },
  { key: "home.module_travel_label", value: "旅行攻略", section: "homepage", label: "模块卡：旅行标题", fieldType: "text", sortOrder: 41 },
  { key: "home.module_legal_label", value: "法律资讯", section: "homepage", label: "模块卡：法律标题", fieldType: "text", sortOrder: 42 },
  { key: "home.module_community_label", value: "华人社区", section: "homepage", label: "模块卡：社区标题", fieldType: "text", sortOrder: 43 },
  { key: "home.module_vietnamese_sub", value: "词汇 · 口语 · 场景", section: "homepage", label: "模块卡：越南语副文字", fieldType: "text", sortOrder: 44 },
  { key: "home.module_travel_sub", value: "探索东南亚", section: "homepage", label: "模块卡：旅行副文字", fieldType: "text", sortOrder: 45 },
  { key: "home.module_legal_sub", value: "法规 · 合同 · 签证", section: "homepage", label: "模块卡：法律副文字", fieldType: "text", sortOrder: 46 },
  { key: "home.module_community_sub", value: "活动 · 聚会", section: "homepage", label: "模块卡：社区副文字", fieldType: "text", sortOrder: 47 },
  // CTA Banner
  { key: "home.cta_title", value: "加入数千华人旅居者的行列", section: "homepage", label: "底部 CTA 标题", fieldType: "text", sortOrder: 50 },
  { key: "home.cta_subtitle", value: "无论是学语言、查法规还是找律师，ViewViet 都为你提供第一手资讯", section: "homepage", label: "底部 CTA 副标题", fieldType: "textarea", sortOrder: 51 },
  { key: "home.cta_button_label", value: "立即开始", section: "homepage", label: "底部 CTA 按钮文字", fieldType: "text", sortOrder: 52 },
  { key: "home.cta_button_url", value: "/learn", section: "homepage", label: "底部 CTA 按钮链接", fieldType: "text", sortOrder: 53 },

  // ── Branding ───────────────────────────────────────────────────────────────
  { key: "site.name", value: "ViewViet", section: "branding", label: "网站名称", fieldType: "text", sortOrder: 10 },
  { key: "site.logo_url", value: "", section: "branding", label: "Logo 图片 URL（留空使用文字）", fieldType: "url", sortOrder: 11 },
  { key: "site.contact_email", value: "", section: "branding", label: "联系邮箱", fieldType: "text", sortOrder: 12 },
  { key: "site.contact_wechat", value: "", section: "branding", label: "微信号", fieldType: "text", sortOrder: 13 },
  { key: "site.contact_phone", value: "", section: "branding", label: "联系电话", fieldType: "text", sortOrder: 14 },
  { key: "site.icp", value: "", section: "branding", label: "ICP 备案号（选填）", fieldType: "text", sortOrder: 15 },

  // ── Footer ─────────────────────────────────────────────────────────────────
  { key: "footer.tagline_zh", value: "华人旅居东南亚的信赖伙伴", section: "footer", label: "页脚标语（中文）", fieldType: "text", sortOrder: 10 },
  { key: "footer.tagline_en", value: "Your trusted partner for Chinese expats in Southeast Asia", section: "footer", label: "页脚标语（英文）", fieldType: "text", sortOrder: 11 },
  { key: "footer.copyright", value: "ViewViet", section: "footer", label: "版权所有者名称", fieldType: "text", sortOrder: 12 },

  // ── Theme ──────────────────────────────────────────────────────────────────
  { key: "theme.primary_hsl", value: "182 80% 26%", section: "theme", label: "主色 HSL", description: "格式：H S% L%，例如 182 80% 26%", fieldType: "color", sortOrder: 10 },
  { key: "theme.accent_hsl", value: "42 100% 47%", section: "theme", label: "强调色 HSL", description: "格式：H S% L%，例如 42 100% 47%", fieldType: "color", sortOrder: 11 },
];

async function ensureDefaults() {
  const existing = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable);
  const existingKeys = new Set(existing.map(r => r.key));
  const missing = DEFAULT_SETTINGS.filter(s => !existingKeys.has(s.key));
  if (missing.length > 0) {
    await db.insert(siteSettingsTable).values(missing).onConflictDoNothing();
  }
}

router.get("/settings", async (req, res) => {
  try {
    await ensureDefaults();
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    res.json(map);
  } catch (err) {
    req.log.error(err, "get settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/settings", async (req, res) => {
  if (!req.session?.userId || req.session.userRole !== "admin") {
    res.status(401).json({ error: "Admin access required" });
    return;
  }
  try {
    await ensureDefaults();
    const rows = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.section, siteSettingsTable.sortOrder);
    res.json(rows);
  } catch (err) {
    req.log.error(err, "get admin settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/settings", async (req, res) => {
  if (!req.session?.userId || req.session.userRole !== "admin") {
    res.status(401).json({ error: "Admin access required" });
    return;
  }
  const updates: Array<{ key: string; value: string }> = req.body;
  if (!Array.isArray(updates)) {
    res.status(400).json({ error: "Body must be an array of {key, value} objects" });
    return;
  }
  try {
    for (const { key, value } of updates) {
      await db
        .update(siteSettingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettingsTable.key, key));
    }
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  } catch (err) {
    req.log.error(err, "update settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
