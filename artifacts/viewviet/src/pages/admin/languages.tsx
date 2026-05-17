import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, EyeOff, Globe } from "lucide-react";

import { DEFAULT_LANGS, LangConfig, LANG_STORAGE_KEY } from "@/lib/lang-utils";

const ACCENT_PRESETS = [
  { label: "琥珀", value: "#f59e0b" },
  { label: "蓝", value: "#3b82f6" },
  { label: "红", value: "#ef4444" },
  { label: "紫", value: "#8b5cf6" },
  { label: "青", value: "#0D7377" },
  { label: "绿", value: "#10b981" },
  { label: "橙", value: "#f97316" },
  { label: "粉", value: "#ec4899" },
];

function loadLangs(): LangConfig[] {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LANGS;
}

function saveLangs(langs: LangConfig[]) {
  localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(langs));
}

export function useLearnLangs(): LangConfig[] {
  const [langs, setLangs] = useState<LangConfig[]>(() => loadLangs());
  useEffect(() => {
    const handler = () => setLangs(loadLangs());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return langs.filter((l) => l.enabled);
}

export default function AdminLanguages() {
  const [langs, setLangs] = useState<LangConfig[]>(() => loadLangs());
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLang, setNewLang] = useState<LangConfig>({
    code: "", label: "", sublabel: "", photo: "", accent: "#0D7377", enabled: true,
  });
  const { toast } = useToast();

  const handleSave = () => {
    saveLangs(langs);
    toast({ title: "语言设置已保存" });
  };

  const handleToggle = (i: number) => {
    setLangs((prev) => prev.map((l, idx) => idx === i ? { ...l, enabled: !l.enabled } : l));
  };

  const handleDelete = (i: number) => {
    if (!confirm(`确认删除「${langs[i].label}」？`)) return;
    setLangs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleFieldChange = (i: number, field: keyof LangConfig, val: string | boolean) => {
    setLangs((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  };

  const handleAddLang = () => {
    if (!newLang.code || !newLang.label) {
      toast({ title: "语言代码和名称不能为空", variant: "destructive" });
      return;
    }
    setLangs((prev) => [...prev, { ...newLang }]);
    setNewLang({ code: "", label: "", sublabel: "", photo: "", accent: "#0D7377", enabled: true });
    setShowAdd(false);
    toast({ title: `已添加「${newLang.label}」` });
  };

  const handleReset = () => {
    if (!confirm("重置为默认语言列表？")) return;
    setLangs(DEFAULT_LANGS);
    saveLangs(DEFAULT_LANGS);
    toast({ title: "已重置为默认设置" });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">语言学习管理</h1>
          <p className="text-sm text-muted-foreground">配置学习中心显示的语言/国家，修改封面图和外观</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>重置默认</Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />保存设置
          </Button>
        </div>
      </div>

      {/* Preview note */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm">
            修改保存后，前往 <Link href="/learn" className="text-primary font-medium underline underline-offset-2">学习中心</Link> 查看效果。每次保存后刷新页面即生效。
          </p>
        </CardContent>
      </Card>

      {/* Language list */}
      <div className="space-y-3">
        {langs.map((lang, i) => (
          <Card key={`${lang.code}-${i}`} className={`transition-opacity ${lang.enabled ? "" : "opacity-50"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Drag handle (visual only) */}
                <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />

                {/* Photo preview */}
                <div
                  className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted"
                  style={{ backgroundImage: `url(${lang.photo})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editIndex === i ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">语言代码（URL用）</Label>
                          <Input value={lang.code} onChange={(e) => handleFieldChange(i, "code", e.target.value)} placeholder="vi / en / zh / ko" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">中文名称</Label>
                          <Input value={lang.label} onChange={(e) => handleFieldChange(i, "label", e.target.value)} placeholder="越南语" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">当地名称</Label>
                          <Input value={lang.sublabel} onChange={(e) => handleFieldChange(i, "sublabel", e.target.value)} placeholder="Tiếng Việt" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">强调色</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {ACCENT_PRESETS.map((p) => (
                              <button
                                key={p.value}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${lang.accent === p.value ? "border-foreground scale-110" : "border-transparent"}`}
                                style={{ background: p.value }}
                                onClick={() => handleFieldChange(i, "accent", p.value)}
                                title={p.label}
                                type="button"
                              />
                            ))}
                            <input
                              type="color"
                              value={lang.accent}
                              onChange={(e) => handleFieldChange(i, "accent", e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border border-muted"
                              title="自定义颜色"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">封面图 URL（建议 Unsplash 或自己上传的图片链接）</Label>
                        <Input value={lang.photo} onChange={(e) => handleFieldChange(i, "photo", e.target.value)} placeholder="https://images.unsplash.com/..." className="h-8 text-sm" />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditIndex(null)}>完成编辑</Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{lang.label}</p>
                        <span className="text-muted-foreground text-sm">{lang.sublabel}</span>
                        <Badge variant="outline" className="text-xs font-mono">{lang.code}</Badge>
                        {!lang.enabled && <Badge variant="secondary" className="text-xs">已隐藏</Badge>}
                        <div className="w-4 h-4 rounded-full flex-shrink-0 ml-1" style={{ background: lang.accent }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{lang.photo || "（无封面图）"}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditIndex(editIndex === i ? null : i)} title="编辑">
                    <span className="text-xs">编辑</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleToggle(i)} title={lang.enabled ? "隐藏" : "显示"}>
                    {lang.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(i)} title="删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new language */}
      {showAdd ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">添加新语言/国家</CardTitle>
            <CardDescription>添加后，系统将在学习中心显示该语言，学员可点击进入词汇学习页</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">语言代码 *</Label>
                <Input value={newLang.code} onChange={(e) => setNewLang(p => ({ ...p, code: e.target.value }))} placeholder="例：th / ja / fr" className="h-8 text-sm" />
                <p className="text-xs text-muted-foreground">用于 URL（/learn/th/words）</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">中文名称 *</Label>
                <Input value={newLang.label} onChange={(e) => setNewLang(p => ({ ...p, label: e.target.value }))} placeholder="泰语" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">当地名称</Label>
                <Input value={newLang.sublabel} onChange={(e) => setNewLang(p => ({ ...p, sublabel: e.target.value }))} placeholder="ภาษาไทย" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">强调色</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      className={`w-6 h-6 rounded-full border-2 ${newLang.accent === p.value ? "border-foreground" : "border-transparent"}`}
                      style={{ background: p.value }}
                      onClick={() => setNewLang(prev => ({ ...prev, accent: p.value }))}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">封面图 URL</Label>
              <Input value={newLang.photo} onChange={(e) => setNewLang(p => ({ ...p, photo: e.target.value }))} placeholder="https://images.unsplash.com/photo-..." className="h-8 text-sm" />
              <p className="text-xs text-muted-foreground">建议使用 Unsplash 高清风景照，宽高比约 4:3</p>
            </div>
            {newLang.photo && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${newLang.photo})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddLang}><Plus className="w-4 h-4 mr-1" />添加</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          添加新语言 / 国家
        </Button>
      )}

      <div className="pt-2 flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="w-4 h-4 mr-2" />
          保存所有设置
        </Button>
      </div>
    </div>
  );
}
