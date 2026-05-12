import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Palette, FileText, Languages, RotateCcw, Save } from "lucide-react";

const SETTINGS_KEY = "vv-site-settings";

interface SiteSettings {
  primaryHsl: string;
  accentHsl: string;
  heroTitleZh: string;
  heroSubtitleZh: string;
  heroTitleEn: string;
  heroSubtitleEn: string;
  heroTitleVi: string;
  heroSubtitleVi: string;
  footerTaglineZh: string;
  footerTaglineEn: string;
}

const DEFAULTS: SiteSettings = {
  primaryHsl: "182 80% 26%",
  accentHsl: "42 100% 47%",
  heroTitleZh: "探索越南,连接东南亚",
  heroSubtitleZh: "您的跨境内容平台----越南语学习、旅行攻略、法律资讯,一站搞定",
  heroTitleEn: "Explore Vietnam, Connect Southeast Asia",
  heroSubtitleEn: "Your cross-border content hub for language, travel, legal and community",
  heroTitleVi: "Khám phá Việt Nam, Kết nối Đông Nam Á",
  heroSubtitleVi: "Nền tảng nội dung xuyên biên giới dành cho người nước ngoài",
  footerTaglineZh: "华人旅居东南亚的信赖伙伴",
  footerTaglineEn: "Your trusted partner for Chinese expats in Southeast Asia",
};

function applyColorsToRoot(settings: Partial<SiteSettings>) {
  const root = document.documentElement;
  if (settings.primaryHsl) root.style.setProperty("--primary", settings.primaryHsl);
  if (settings.accentHsl) root.style.setProperty("--accent", settings.accentHsl);
}

export function loadSiteSettings(): SiteSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function initSiteSettings() {
  const settings = loadSiteSettings();
  applyColorsToRoot(settings);
}

function ColorPreview({ hsl, label }: { hsl: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full border shadow-sm flex-shrink-0"
        style={{ background: `hsl(${hsl})` }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(loadSiteSettings);
  const [activeSection, setActiveSection] = useState<"colors" | "content" | "translations">("colors");

  useEffect(() => {
    applyColorsToRoot(settings);
  }, [settings.primaryHsl, settings.accentHsl]);

  const update = (key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyColorsToRoot(settings);
    toast({ title: "set已保存", description: "页面样式已更新" });
  };

  const handleReset = () => {
    setSettings({ ...DEFAULTS });
    localStorage.removeItem(SETTINGS_KEY);
    applyColorsToRoot(DEFAULTS);
    toast({ title: "已恢复defaultset" });
  };

  const SECTIONS = [
    { key: "colors" as const, label: "主题配色", icon: Palette },
    { key: "content" as const, label: "页面内容", icon: FileText },
    { key: "translations" as const, label: "多语言文案", icon: Languages },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button>
        </Link>
        <h1 className="text-2xl font-bold">站点set</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />恢复default
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />保存set
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <aside className="w-44 flex-shrink-0 hidden md:block">
          <div className="space-y-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile section tabs */}
        <div className="md:hidden flex gap-2 flex-wrap mb-2 w-full">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSection === key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Color Theme ── */}
          {activeSection === "colors" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" />主题配色
                </CardTitle>
                <CardDescription>
                  调整主品牌色和强调色。使用 HSL 格式,例如 <code className="bg-muted px-1 rounded text-xs">182 80% 26%</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>主色 (Primary)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={settings.primaryHsl}
                        onChange={(e) => update("primaryHsl", e.target.value)}
                        placeholder="182 80% 26%"
                        className="font-mono text-sm"
                      />
                    </div>
                    <ColorPreview hsl={settings.primaryHsl} label={`hsl(${settings.primaryHsl})`} />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[
                        { label: "default青色", val: "182 80% 26%" },
                        { label: "深绿", val: "160 70% 25%" },
                        { label: "靛蓝", val: "220 70% 40%" },
                        { label: "紫色", val: "270 60% 45%" },
                      ].map(({ label, val }) => (
                        <button
                          key={val}
                          className="text-xs border rounded px-2 py-1 hover:bg-muted flex items-center gap-1"
                          onClick={() => update("primaryHsl", val)}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${val})` }} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>强调色 (Accent)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={settings.accentHsl}
                        onChange={(e) => update("accentHsl", e.target.value)}
                        placeholder="42 100% 47%"
                        className="font-mono text-sm"
                      />
                    </div>
                    <ColorPreview hsl={settings.accentHsl} label={`hsl(${settings.accentHsl})`} />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[
                        { label: "default金色", val: "42 100% 47%" },
                        { label: "橙色", val: "25 90% 50%" },
                        { label: "红色", val: "0 85% 55%" },
                        { label: "粉色", val: "330 80% 60%" },
                      ].map(({ label, val }) => (
                        <button
                          key={val}
                          className="text-xs border rounded px-2 py-1 hover:bg-muted flex items-center gap-1"
                          onClick={() => update("accentHsl", val)}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${val})` }} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="border rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">预览</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-lg px-4 py-2 text-white text-sm font-medium" style={{ background: `hsl(${settings.primaryHsl})` }}>
                      主色按钮
                    </div>
                    <div className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: `hsl(${settings.accentHsl})`, color: "#111" }}>
                      强调色
                    </div>
                    <div className="rounded-lg px-4 py-2 text-sm font-medium border-2" style={{ borderColor: `hsl(${settings.primaryHsl})`, color: `hsl(${settings.primaryHsl})` }}>
                      描边样式
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Page Content ── */}
          {activeSection === "content" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />首页内容
                </CardTitle>
                <CardDescription>set首页 Hero 区域的标题和副标题(中文)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>首页主标题(中文)</Label>
                  <Input
                    value={settings.heroTitleZh}
                    onChange={(e) => update("heroTitleZh", e.target.value)}
                    placeholder="探索越南,连接东南亚"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>首页副标题(中文)</Label>
                  <Textarea
                    rows={2}
                    value={settings.heroSubtitleZh}
                    onChange={(e) => update("heroSubtitleZh", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>页脚标语(中文)</Label>
                  <Input
                    value={settings.footerTaglineZh}
                    onChange={(e) => update("footerTaglineZh", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>页脚标语(英文)</Label>
                  <Input
                    value={settings.footerTaglineEn}
                    onChange={(e) => update("footerTaglineEn", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Translations ── */}
          {activeSection === "translations" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="w-4 h-4" />多语言文案
                </CardTitle>
                <CardDescription>为英文和越文版本set Hero 区域的标题文案</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-medium border-b pb-1">英文 (English)</p>
                  <div className="space-y-1.5">
                    <Label>首页主标题</Label>
                    <Input value={settings.heroTitleEn} onChange={(e) => update("heroTitleEn", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>首页副标题</Label>
                    <Textarea rows={2} value={settings.heroSubtitleEn} onChange={(e) => update("heroSubtitleEn", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium border-b pb-1">越文 (Tiếng Việt)</p>
                  <div className="space-y-1.5">
                    <Label>首页主标题</Label>
                    <Input value={settings.heroTitleVi} onChange={(e) => update("heroTitleVi", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>首页副标题</Label>
                    <Textarea rows={2} value={settings.heroSubtitleVi} onChange={(e) => update("heroSubtitleVi", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />恢复default
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />保存所有set
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
