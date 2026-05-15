import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Upload, CheckCircle2, AlertCircle, Trash2,
  Layers, AlertTriangle, CheckSquare, Square, Search, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LANGS = ["vi", "en", "zh", "ko"];

const SCENE_EXAMPLE = `sentence,languageCode,sceneName,pronunciation,translationZh,translationEn,translationVi,difficulty,isPublished
Xin chào! Tôi muốn đặt bàn.,vi,餐厅,sin chào tôi muốn đặt bàn,你好！我想预定一张桌子。,Hello! I'd like to make a reservation.,Xin chào! Tôi muốn đặt bàn.,1,true`;

const COMPLEX_EXAMPLE = `sentence,languageCode,pronunciation,translationZh,translationEn,translationVi,grammarNotes,context,difficulty,isPublished
Nếu tôi có thể nói tiếng Việt thì tôi đã không cần phiên dịch.,vi,,如果我会说越南语，我就不需要翻译了。,If I could speak Vietnamese I wouldn't need a translator.,Nếu tôi có thể nói tiếng Việt...,条件句 nếu...thì,商务,4,true`;

function parseCsv(text: string, requiredFields: string[]) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["至少需要标题行和一行数据"] };
  const headers = lines[0].split(",").map(h => h.trim());
  const missing = requiredFields.filter(f => !headers.includes(f));
  if (missing.length > 0) return { rows: [], errors: [`缺少必要列：${missing.join(", ")}`] };
  const rows: any[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, i) => {
    const vals = line.split(",").map(v => v.trim());
    if (vals.every(v => !v)) return;
    const row: Record<string, any> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    if (row.difficulty) row.difficulty = Number(row.difficulty) || 1;
    if (row.isPublished !== undefined) row.isPublished = row.isPublished === "true";
    if (!row.sentence) { errors.push(`第 ${i + 2} 行：sentence 为空`); return; }
    rows.push(row);
  });
  return { rows, errors };
}

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

type MainTab = "scene" | "complex" | "upload";

export default function AdminSentences() {
  const { t } = useTranslation();
  const [mainTab, setMainTab] = useState<MainTab>("scene");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.sentences")}</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {([
          { key: "scene", label: "情景句子" },
          { key: "complex", label: "复杂句型" },
          { key: "upload", label: "批量导入" },
        ] as { key: MainTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${mainTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMainTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {mainTab === "scene" && <SceneList />}
      {mainTab === "complex" && <ComplexList />}
      {mainTab === "upload" && <BulkUpload />}
    </div>
  );
}

function SceneList() {
  const { toast } = useToast();
  const [lang, setLang] = useState("vi");
  const [scene, setScene] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showBulkFilter, setShowBulkFilter] = useState(false);
  const [bulkFilterLang, setBulkFilterLang] = useState("vi");
  const [bulkFilterScene, setBulkFilterScene] = useState("");

  const params = new URLSearchParams({ language_code: lang, page: String(page), limit: "50" });
  if (scene) params.set("scene_name", scene);

  const { data: resp, isLoading, refetch } = useQuery({
    queryKey: ["admin-scene-sentences", lang, scene, page],
    queryFn: () => adminFetch(`/admin/scene-sentences?${params}`),
  });

  const { data: scenesRaw } = useQuery({
    queryKey: ["admin-scene-scenes", lang],
    queryFn: () => adminFetch(`/admin/scene-sentences/scenes?language_code=${lang}`),
  });

  const rows = (resp as any)?.data ?? [];
  const pagination = (resp as any)?.pagination;
  const scenes: string[] = (scenesRaw as string[]) ?? [];

  const allIds = rows.map((r: any) => r.id as number);
  const allSelected = allIds.length > 0 && allIds.every((id: number) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allIds.forEach((id: number) => n.delete(id)); return n; });
    else setSelected(prev => new Set([...prev, ...allIds]));
  };
  const toggleOne = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const reset = () => { setSelected(new Set()); refetch(); };

  const handleBulkDelete = async () => {
    if (!confirm(`确认删除选中的 ${selected.size} 条句子？`)) return;
    try {
      const r = await adminFetch("/admin/scene-sentences/bulk-delete", { method: "POST", body: JSON.stringify({ ids: [...selected] }) });
      toast({ title: `已删除 ${r.deleted} 条` }); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteDuplicates = async () => {
    if (!confirm(`确认清除 ${lang.toUpperCase()} 语言的重复情景句子？系统保留每组的最早记录。`)) return;
    try {
      const r = await adminFetch(`/admin/scene-sentences/duplicates?language_code=${lang}`, { method: "DELETE" });
      toast({ title: `已清除 ${r.deleted} 条重复` }); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteByFilter = async () => {
    const target = bulkFilterScene ? `场景「${bulkFilterScene}」` : `语言 ${bulkFilterLang.toUpperCase()} 全部情景句子`;
    if (!confirm(`确认删除 ${target}？此操作不可撤销。`)) return;
    const p = new URLSearchParams({ language_code: bulkFilterLang });
    if (bulkFilterScene) p.set("scene_name", bulkFilterScene);
    try {
      const r = await adminFetch(`/admin/scene-sentences/by-filter?${p}`, { method: "DELETE" });
      toast({ title: `已删除 ${r.deleted} 条` }); setShowBulkFilter(false); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {LANGS.map(l => (
          <button key={l}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => { setLang(l); setScene(""); setPage(1); setSelected(new Set()); }}
          >{l.toUpperCase()}</button>
        ))}
        <select className="border rounded-lg px-3 py-1.5 text-sm bg-background" value={scene} onChange={e => { setScene(e.target.value); setPage(1); setSelected(new Set()); }}>
          <option value="">全部场景</option>
          {scenes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">已选 {selected.size} 条</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}><X className="w-3.5 h-3.5 mr-1" />取消</Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="w-3.5 h-3.5 mr-1" />删除选中</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">{pagination ? `共 ${pagination.total} 条` : ""}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50" onClick={handleDeleteDuplicates}>
            <Layers className="w-3.5 h-3.5 mr-1" />清除重复
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowBulkFilter(!showBulkFilter)}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />按模块删除
          </Button>
        </div>
      </div>

      {showBulkFilter && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium text-destructive">按语言/场景批量删除（不可撤销）</p>
            <div className="flex gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">语言</Label>
                <select className="border rounded-md px-3 py-1.5 text-sm bg-background" value={bulkFilterLang} onChange={e => { setBulkFilterLang(e.target.value); setBulkFilterScene(""); }}>
                  {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">场景（留空=全部）</Label>
                <SceneSelect lang={bulkFilterLang} value={bulkFilterScene} onChange={setBulkFilterScene} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDeleteByFilter}><Trash2 className="w-3.5 h-3.5 mr-1" />确认删除</Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkFilter(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleAll}>{allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}</button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">句子</th>
                    <th className="text-left px-4 py-3 font-medium">中文翻译</th>
                    <th className="text-left px-4 py-3 font-medium">场景</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
                  ) : rows.map((r: any) => (
                    <tr key={r.id} className={`border-b transition-colors ${selected.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleOne(r.id)}>{selected.has(r.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}</button>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <p className="truncate">{r.sentence}</p>
                        {r.pronunciation && <p className="text-xs text-muted-foreground font-mono truncate">{r.pronunciation}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate">{r.translationZh ?? "—"}</td>
                      <td className="px-4 py-2.5">{r.sceneName ? <Badge variant="secondary" className="text-xs">{r.sceneName}</Badge> : "—"}</td>
                      <td className="px-4 py-2.5"><Badge variant={r.isPublished ? "default" : "outline"} className="text-xs">{r.isPublished ? "已发布" : "草稿"}</Badge></td>
                      <td className="px-4 py-2.5">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={async () => {
                            try {
                              await adminFetch(`/admin/scene-sentences/bulk-delete`, { method: "POST", body: JSON.stringify({ ids: [r.id] }) });
                              toast({ title: "已删除" }); reset();
                            } catch { toast({ title: "删除失败", variant: "destructive" }); }
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">第 {page} / {pagination.totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}

function SceneSelect({ lang, value, onChange }: { lang: string; value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-scene-scenes", lang],
    queryFn: () => adminFetch(`/admin/scene-sentences/scenes?language_code=${lang}`),
  });
  const scenes: string[] = (data as string[]) ?? [];
  return (
    <select className="border rounded-md px-3 py-1.5 text-sm bg-background" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">全部场景</option>
      {scenes.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function ComplexList() {
  const { toast } = useToast();
  const [lang, setLang] = useState("vi");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showBulkFilter, setShowBulkFilter] = useState(false);
  const [bulkFilterLang, setBulkFilterLang] = useState("vi");

  const params = new URLSearchParams({ language_code: lang, page: String(page), limit: "50" });

  const { data: resp, isLoading, refetch } = useQuery({
    queryKey: ["admin-complex-sentences", lang, page],
    queryFn: () => adminFetch(`/admin/complex-sentences?${params}`),
  });

  const rows = (resp as any)?.data ?? [];
  const pagination = (resp as any)?.pagination;
  const allIds = rows.map((r: any) => r.id as number);
  const allSelected = allIds.length > 0 && allIds.every((id: number) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allIds.forEach((id: number) => n.delete(id)); return n; });
    else setSelected(prev => new Set([...prev, ...allIds]));
  };
  const toggleOne = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const reset = () => { setSelected(new Set()); refetch(); };

  const handleBulkDelete = async () => {
    if (!confirm(`确认删除选中的 ${selected.size} 条句子？`)) return;
    try {
      const r = await adminFetch("/admin/complex-sentences/bulk-delete", { method: "POST", body: JSON.stringify({ ids: [...selected] }) });
      toast({ title: `已删除 ${r.deleted} 条` }); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteDuplicates = async () => {
    if (!confirm(`确认清除 ${lang.toUpperCase()} 语言的重复复杂句型？`)) return;
    try {
      const r = await adminFetch(`/admin/complex-sentences/duplicates?language_code=${lang}`, { method: "DELETE" });
      toast({ title: `已清除 ${r.deleted} 条重复` }); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteByFilter = async () => {
    if (!confirm(`确认删除语言 ${bulkFilterLang.toUpperCase()} 的所有复杂句型？此操作不可撤销。`)) return;
    try {
      const r = await adminFetch(`/admin/complex-sentences/by-filter?language_code=${bulkFilterLang}`, { method: "DELETE" });
      toast({ title: `已删除 ${r.deleted} 条` }); setShowBulkFilter(false); reset();
    } catch (e: any) { toast({ title: "操作失败", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {LANGS.map(l => (
          <button key={l}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => { setLang(l); setPage(1); setSelected(new Set()); }}
          >{l.toUpperCase()}</button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">已选 {selected.size} 条</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}><X className="w-3.5 h-3.5 mr-1" />取消</Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="w-3.5 h-3.5 mr-1" />删除选中</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{pagination ? `共 ${pagination.total} 条` : ""}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50" onClick={handleDeleteDuplicates}>
            <Layers className="w-3.5 h-3.5 mr-1" />清除重复
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowBulkFilter(!showBulkFilter)}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />按语言删除
          </Button>
        </div>
      </div>

      {showBulkFilter && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium text-destructive">按语言批量删除全部复杂句型（不可撤销）</p>
            <div className="space-y-1">
              <Label className="text-xs">语言</Label>
              <select className="border rounded-md px-3 py-1.5 text-sm bg-background" value={bulkFilterLang} onChange={e => setBulkFilterLang(e.target.value)}>
                {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDeleteByFilter}><Trash2 className="w-3.5 h-3.5 mr-1" />确认删除</Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkFilter(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleAll}>{allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}</button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">句子</th>
                    <th className="text-left px-4 py-3 font-medium">中文翻译</th>
                    <th className="text-left px-4 py-3 font-medium">语法注释</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
                  ) : rows.map((r: any) => (
                    <tr key={r.id} className={`border-b transition-colors ${selected.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleOne(r.id)}>{selected.has(r.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}</button>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <p className="truncate">{r.sentence}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate">{r.translationZh ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate">{r.grammarNotes ?? "—"}</td>
                      <td className="px-4 py-2.5"><Badge variant={r.isPublished ? "default" : "outline"} className="text-xs">{r.isPublished ? "已发布" : "草稿"}</Badge></td>
                      <td className="px-4 py-2.5">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={async () => {
                            try {
                              await adminFetch(`/admin/complex-sentences/bulk-delete`, { method: "POST", body: JSON.stringify({ ids: [r.id] }) });
                              toast({ title: "已删除" }); reset();
                            } catch { toast({ title: "删除失败", variant: "destructive" }); }
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">第 {page} / {pagination.totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}

function BulkUpload() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"scene" | "complex">("scene");
  const [sceneCsv, setSceneCsv] = useState("");
  const [complexCsv, setComplexCsv] = useState("");
  const [sceneLoading, setSceneLoading] = useState(false);
  const [complexLoading, setComplexLoading] = useState(false);
  const [sceneResult, setSceneResult] = useState<{ inserted: number; errors: any[] } | null>(null);
  const [complexResult, setComplexResult] = useState<{ inserted: number; errors: any[] } | null>(null);

  async function uploadScene() {
    const { rows, errors } = parseCsv(sceneCsv, ["sentence", "sceneName"]);
    if (errors.length > 0) { toast({ title: errors[0], variant: "destructive" }); return; }
    if (rows.length === 0) { toast({ title: "没有有效数据", variant: "destructive" }); return; }
    setSceneLoading(true);
    try {
      const data = await adminFetch("/admin/scene-sentences/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      setSceneResult(data);
      toast({ title: `成功导入 ${data.inserted} 条情景句子` });
    } catch (e: any) {
      toast({ title: e.message || "上传失败", variant: "destructive" });
    } finally { setSceneLoading(false); }
  }

  async function uploadComplex() {
    const { rows, errors } = parseCsv(complexCsv, ["sentence"]);
    if (errors.length > 0) { toast({ title: errors[0], variant: "destructive" }); return; }
    if (rows.length === 0) { toast({ title: "没有有效数据", variant: "destructive" }); return; }
    setComplexLoading(true);
    try {
      const data = await adminFetch("/admin/complex-sentences/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      setComplexResult(data);
      toast({ title: `成功导入 ${data.inserted} 条复杂句型` });
    } catch (e: any) {
      toast({ title: e.message || "上传失败", variant: "destructive" });
    } finally { setComplexLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {(["scene", "complex"] as const).map(tp => (
          <button key={tp}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tp ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(tp)}
          >
            {tp === "scene" ? "情景句子" : "复杂句型"}
          </button>
        ))}
      </div>

      {tab === "scene" && (
        <Card>
          <CardHeader><CardTitle className="text-base">情景句子 — CSV 批量上传</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto">{SCENE_EXAMPLE}</div>
            <Button variant="ghost" size="sm" className="text-xs -mt-2" onClick={() => setSceneCsv(SCENE_EXAMPLE)}>填入示例数据</Button>
            <Textarea rows={10} placeholder="粘贴 CSV 内容..." value={sceneCsv} onChange={e => { setSceneCsv(e.target.value); setSceneResult(null); }} className="font-mono text-xs" />
            <div className="flex items-center gap-3">
              <Button onClick={uploadScene} disabled={sceneLoading || !sceneCsv.trim()}>
                <Upload className="w-4 h-4 mr-2" />{sceneLoading ? "上传中..." : "上传情景句子"}
              </Button>
              {sceneResult && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>成功 {sceneResult.inserted} 条</span>
                  {(sceneResult?.errors?.length ?? 0) > 0 && <Badge variant="destructive" className="text-xs">{sceneResult?.errors?.length} 错误</Badge>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "complex" && (
        <Card>
          <CardHeader><CardTitle className="text-base">复杂句型 — CSV 批量上传</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto">{COMPLEX_EXAMPLE}</div>
            <Button variant="ghost" size="sm" className="text-xs -mt-2" onClick={() => setComplexCsv(COMPLEX_EXAMPLE)}>填入示例数据</Button>
            <Textarea rows={10} placeholder="粘贴 CSV 内容..." value={complexCsv} onChange={e => { setComplexCsv(e.target.value); setComplexResult(null); }} className="font-mono text-xs" />
            <div className="flex items-center gap-3">
              <Button onClick={uploadComplex} disabled={complexLoading || !complexCsv.trim()}>
                <Upload className="w-4 h-4 mr-2" />{complexLoading ? "上传中..." : "上传复杂句型"}
              </Button>
              {complexResult && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>成功 {complexResult.inserted} 条</span>
                  {(complexResult?.errors?.length ?? 0) > 0 && <Badge variant="destructive" className="text-xs">{complexResult?.errors?.length} 错误</Badge>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
