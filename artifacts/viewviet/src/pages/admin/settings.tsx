import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetAdminSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RotateCcw, Palette, FileText, Globe, Layout, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type SiteSettingRow = {
  key: string;
  value: string;
  section: string;
  label: string;
  description?: string | null;
  fieldType: string;
  sortOrder: number;
};

export function applyColorsToRoot(map: Record<string, string>) {
  const root = document.documentElement;
  if (map["theme.primary_hsl"]) root.style.setProperty("--primary", map["theme.primary_hsl"]);
  if (map["theme.accent_hsl"]) root.style.setProperty("--accent", map["theme.accent_hsl"]);
}

const SECTION_META: Record<string, { label: string; icon: any; description: string }> = {
  homepage: { label: "首页内容", icon: FileText, description: "编辑首页 Hero 区域、板块标题、模块卡片和底部 CTA" },
  branding: { label: "品牌信息", icon: Globe, description: "网站名称、Logo、联系方式等品牌资产" },
  footer: { label: "页脚文案", icon: Layout, description: "页脚标语、版权信息" },
  theme: { label: "主题配色", icon: Palette, description: "调整主色和强调色（HSL 格式）" },
};

const SECTION_ORDER = ["homepage", "branding", "footer", "theme"];

function SettingField({ row, value, onChange }: { row: SiteSettingRow; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium">{row.label}</Label>
        {row.description && <span className="text-xs text-muted-foreground max-w-xs text-right">{row.description}</span>}
      </div>
      {row.fieldType === "textarea" ? (
        <Textarea rows={2} value={value} onChange={e => onChange(e.target.value)} className="text-sm" />
      ) : row.fieldType === "color" ? (
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="font-mono text-sm flex-1"
            placeholder="182 80% 26%"
          />
          <div
            className="w-8 h-8 rounded-full border shadow-sm flex-shrink-0"
            style={{ background: `hsl(${value})` }}
          />
        </div>
      ) : row.fieldType === "url" ? (
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input value={value} onChange={e => onChange(e.target.value)} className="text-sm" placeholder="https://..." />
        </div>
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} className="text-sm" />
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: settingsRaw, isLoading, refetch } = useGetAdminSettings();
  const updateSettings = useUpdateSettings();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>("homepage");

  const settings = (settingsRaw as SiteSettingRow[] | undefined) ?? [];

  useEffect(() => {
    if (settings.length > 0 && Object.keys(edits).length === 0) {
      const map: Record<string, string> = {};
      for (const s of settings) map[s.key] = s.value;
      setEdits(map);
    }
  }, [settings]);

  const getValue = (key: string) => edits[key] ?? "";
  const setValue = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
    if (key === "theme.primary_hsl" || key === "theme.accent_hsl") {
      applyColorsToRoot({ ...edits, [key]: value });
    }
  };

  const handleSave = async () => {
    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }));
    try {
      const resultData = await updateSettings.mutateAsync({ data: updates as any });
      const map = resultData as Record<string, string>;
      applyColorsToRoot(map);
      toast({ title: "设置已保存", description: "所有更改已同步到服务器" });
      refetch();
    } catch (err: any) {
      toast({ title: "保存失败", description: String(err), variant: "destructive" });
    }
  };

  const handleReset = () => {
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    setEdits(map);
    applyColorsToRoot(map);
    toast({ title: "已还原为服务器最新值" });
  };

  const sectionRows = (section: string) =>
    settings.filter(s => s.section === section).sort((a, b) => a.sortOrder - b.sortOrder);

  const sections = SECTION_ORDER.filter(k => sectionRows(k).length > 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button>
        </Link>
        <h1 className="text-2xl font-bold">站点设置</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-1" />还原
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
            <Save className="w-4 h-4 mr-1" />
            {updateSettings.isPending ? "保存中..." : "保存全部"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-44 flex-shrink-0 hidden md:block">
          <div className="space-y-1">
            {sections.map(key => {
              const meta = SECTION_META[key];
              const Icon = meta?.icon ?? FileText;
              return (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {meta?.label ?? key}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Mobile section tabs */}
        <div className="md:hidden flex gap-2 flex-wrap mb-2 w-full">
          {sections.map(key => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSection === key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {SECTION_META[key]?.label ?? key}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            sections.map(section => {
              if (section !== activeSection) return null;
              const meta = SECTION_META[section];
              const rows = sectionRows(section);

              const groups = rows.reduce((acc: Record<string, SiteSettingRow[]>, row) => {
                const prefix = row.key.split(".").slice(0, 2).join(".");
                if (!acc[prefix]) acc[prefix] = [];
                acc[prefix].push(row);
                return acc;
              }, {});

              return (
                <div key={section} className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {meta?.icon && <meta.icon className="w-4 h-4" />}
                        {meta?.label ?? section}
                      </CardTitle>
                      {meta?.description && <CardDescription>{meta.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {Object.entries(groups).map(([, groupRows]) => (
                        <div key={groupRows[0].key} className="space-y-4">
                          {groupRows.length > 1 && (
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                              {groupRows[0].label.replace(/（.*?）$/, "").replace(/\s*[（(].*/, "").split(" ")[0]}
                            </p>
                          )}
                          {groupRows.map(row => (
                            <SettingField
                              key={row.key}
                              row={row}
                              value={getValue(row.key)}
                              onChange={v => setValue(row.key, v)}
                            />
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Color preview for theme section */}
                  {section === "theme" && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-muted-foreground">实时预览</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          <div className="rounded-lg px-4 py-2 text-white text-sm font-medium" style={{ background: `hsl(${getValue("theme.primary_hsl")})` }}>
                            主色按钮
                          </div>
                          <div className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: `hsl(${getValue("theme.accent_hsl")})`, color: "#111" }}>
                            强调色
                          </div>
                          <div className="rounded-lg px-4 py-2 text-sm font-medium border-2" style={{ borderColor: `hsl(${getValue("theme.primary_hsl")})`, color: `hsl(${getValue("theme.primary_hsl")})` }}>
                            描边样式
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          颜色在输入时实时生效，保存后对所有访客永久生效。
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-1" />还原
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
              <Save className="w-4 h-4 mr-1" />
              {updateSettings.isPending ? "保存中..." : "保存所有设置"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function initSiteSettings() {
}
