import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetLegalDocuments, getGetLegalDocumentsQueryKey,
  useCreateLegalDocument,
  useUpdateLegalDocument,
  useDeleteLegalDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Pencil, X, FileText, Globe, Calendar, Link2, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ASEAN_COUNTRIES = [
  "越南", "泰国", "缅甸", "柬埔寨", "老挝",
  "马来西亚", "新加坡", "印度尼西亚", "菲律宾", "文莱", "东帝汶",
];

const DOCUMENT_TYPES = ["宪法", "法律", "法令", "条例", "决议", "通知", "协定", "议定书", "其他"];

const CATEGORIES = ["劳动法", "税法", "公司法", "外商投资", "移民", "房产", "知识产权", "海关", "刑法", "民法", "其他"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]+/g, (m) => m.split("").map((c) => c.charCodeAt(0).toString(16)).join(""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `doc-${Date.now()}`;
}

const EMPTY_FORM = {
  titleZh: "", titleEn: "", titleLocal: "",
  slug: "",
  documentNumber: "", documentType: "", country: "",
  category: "", issuingBody: "",
  contentZh: "", contentEn: "", contentLocal: "",
  issueDate: "", effectiveDate: "",
  tags: "",
  isFeatured: false, isPublished: false,
};

export default function AdminLegalDocuments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"list" | "add">("list");
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [country, setCountry] = useState<string>("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const { data: resp, isLoading } = useGetLegalDocuments(
    { country: country || undefined, limit: 50 } as any,
    { query: { queryKey: getGetLegalDocumentsQueryKey({ country: country || undefined, limit: 50 } as any) } },
  );

  const createDoc = useCreateLegalDocument();
  const deleteDoc = useDeleteLegalDocument();

  const docs = (resp as any)?.data ?? [];

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => {
      const next = { ...prev, [k]: e.target.value };
      if (k === "titleZh" && !prev.slug) next.slug = generateSlug(e.target.value);
      return next;
    });

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/legal-documents/import-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "提取失败");
      // Fill the form with AI-extracted data
      setForm((prev) => ({
        ...prev,
        titleZh: data.titleZh ?? prev.titleZh,
        titleEn: data.titleEn ?? prev.titleEn,
        titleLocal: data.titleLocal ?? prev.titleLocal,
        slug: data.titleZh ? generateSlug(data.titleZh) : prev.slug,
        documentNumber: data.documentNumber ?? prev.documentNumber,
        documentType: data.documentType ?? prev.documentType,
        country: data.country ?? prev.country,
        category: data.category ?? prev.category,
        issuingBody: data.issuingBody ?? prev.issuingBody,
        issueDate: data.issueDate ?? prev.issueDate,
        effectiveDate: data.effectiveDate ?? prev.effectiveDate,
        contentZh: data.contentZh ?? prev.contentZh,
        contentEn: data.contentEn ?? prev.contentEn,
        contentLocal: data.contentLocal ?? prev.contentLocal,
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : prev.tags,
      }));
      setTab("add");
      toast({ title: "AI 提取成功，请检查并补充后保存" });
      setImportUrl("");
    } catch (e: any) {
      toast({ title: e?.message ?? "提取失败，请重试", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleZh.trim() || !form.country || !form.slug.trim()) {
      toast({ title: "标题（中文）、国家和Slug为必填项", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : undefined,
      effectiveDate: form.effectiveDate ? new Date(form.effectiveDate).toISOString() : undefined,
      titleEn: form.titleEn || undefined,
      titleLocal: form.titleLocal || undefined,
      documentNumber: form.documentNumber || undefined,
      documentType: form.documentType || undefined,
      category: form.category || undefined,
      issuingBody: form.issuingBody || undefined,
      contentZh: form.contentZh || undefined,
      contentEn: form.contentEn || undefined,
      contentLocal: form.contentLocal || undefined,
    };
    createDoc.mutate({ data: payload as any }, {
      onSuccess: () => {
        toast({ title: "法律条文已创建" });
        setForm({ ...EMPTY_FORM });
        setTab("list");
        queryClient.invalidateQueries({ queryKey: getGetLegalDocumentsQueryKey({} as any) });
      },
      onError: (e: any) => toast({ title: "创建失败: " + (e?.message ?? ""), variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("确认删除该法律条文？")) return;
    deleteDoc.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("admin.delete") + " ✓" });
        queryClient.invalidateQueries({ queryKey: getGetLegalDocumentsQueryKey({} as any) });
      },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{t("admin.dashboard")}</Button>
        </Link>
        <h1 className="text-2xl font-bold">法律条文管理</h1>
        <Badge variant="secondary" className="text-xs">东盟11国</Badge>
        <Button size="sm" className="ml-auto" onClick={() => { setForm({ ...EMPTY_FORM }); setTab("add"); }}>
          <Plus className="w-4 h-4 mr-1" />新增条文
        </Button>
      </div>

      {/* AI URL Import Panel */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI 智能导入</span>
          <span className="text-xs text-muted-foreground">粘贴法律文件网页链接，AI 自动识别并翻译成三种语言</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-background"
              placeholder="粘贴法律条文网页地址，例如 https://luatvietnam.vn/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isImporting && handleImportUrl()}
              disabled={isImporting}
            />
          </div>
          <Button onClick={handleImportUrl} disabled={isImporting || !importUrl.trim()} className="gap-1.5 shrink-0">
            {isImporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />AI 识别中...</>
            ) : (
              <><Sparkles className="w-4 h-4" />AI 提取</>
            )}
          </Button>
        </div>
        {isImporting && (
          <p className="text-xs text-muted-foreground mt-2">正在抓取网页内容并调用 AI 提取+翻译，通常需要 10-20 秒...</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "list" as const, label: `条文列表 (${docs.length})` },
          { id: "add" as const, label: "新增条文" },
        ].map((item) => (
          <button
            key={item.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Country Filter */}
      {tab === "list" && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!country ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setCountry("")}
          >全部国家</button>
          {ASEAN_COUNTRIES.map((c) => (
            <button
              key={c}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${country === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => setCountry(c)}
            >{c}</button>
          ))}
        </div>
      )}

      {/* Add Form */}
      {tab === "add" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">新增法律条文</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTab("list")}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <Label>中文标题 *</Label>
                  <Input value={form.titleZh} onChange={set("titleZh")} placeholder="法律条文中文名称" required />
                </div>
                <div className="space-y-1">
                  <Label>英文标题</Label>
                  <Input value={form.titleEn} onChange={set("titleEn")} placeholder="English title" />
                </div>
                <div className="space-y-1">
                  <Label>当地语言标题</Label>
                  <Input value={form.titleLocal} onChange={set("titleLocal")} placeholder="Tiêu đề tiếng địa phương" />
                </div>
                <div className="space-y-1">
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={set("slug")} placeholder="url-friendly-slug" required />
                </div>
                <div className="space-y-1">
                  <Label>文号/编号</Label>
                  <Input value={form.documentNumber} onChange={set("documentNumber")} placeholder="e.g. Decree No. 123/2024/ND-CP" />
                </div>
                <div className="space-y-1">
                  <Label>所属国家 *</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.country} onChange={set("country")} required>
                    <option value="">选择国家...</option>
                    {ASEAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>文件类型</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.documentType} onChange={set("documentType")}>
                    <option value="">选择类型...</option>
                    {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>法律领域</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.category} onChange={set("category")}>
                    <option value="">选择领域...</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>颁发机构</Label>
                  <Input value={form.issuingBody} onChange={set("issuingBody")} placeholder="e.g. 越南国会" />
                </div>
                <div className="space-y-1">
                  <Label>颁布日期</Label>
                  <Input type="date" value={form.issueDate} onChange={set("issueDate")} />
                </div>
                <div className="space-y-1">
                  <Label>生效日期</Label>
                  <Input type="date" value={form.effectiveDate} onChange={set("effectiveDate")} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>中文全文</Label>
                  <Textarea rows={6} value={form.contentZh} onChange={set("contentZh")} placeholder="条文中文内容..." />
                </div>
                <div className="space-y-1">
                  <Label>英文全文</Label>
                  <Textarea rows={4} value={form.contentEn} onChange={set("contentEn")} placeholder="Full text in English..." />
                </div>
                <div className="space-y-1">
                  <Label>当地语言全文</Label>
                  <Textarea rows={4} value={form.contentLocal} onChange={set("contentLocal")} placeholder="Nội dung tiếng địa phương..." />
                </div>
              </div>

              <div className="space-y-1">
                <Label>标签（逗号分隔）</Label>
                <Input value={form.tags} onChange={set("tags")} placeholder="劳动合同, 外资企业, ..." />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} className="accent-primary h-4 w-4" />
                  推荐显示
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} className="accent-primary h-4 w-4" />
                  立即发布
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createDoc.isPending}>
                  {createDoc.isPending ? "保存中..." : "保存条文"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setTab("list")}>{t("admin.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      {tab === "list" && (
        <>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">暂无法律条文</p>
              <Button size="sm" className="mt-3" onClick={() => setTab("add")}><Plus className="w-4 h-4 mr-1" />新增第一条</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {doc.country && <Badge variant="outline" className="text-xs"><Globe className="w-2.5 h-2.5 mr-1" />{doc.country}</Badge>}
                          {doc.documentType && <Badge variant="secondary" className="text-xs">{doc.documentType}</Badge>}
                          {doc.category && <Badge variant="secondary" className="text-xs">{doc.category}</Badge>}
                          <Badge variant={doc.isPublished ? "default" : "outline"} className="text-xs">
                            {doc.isPublished ? "已发布" : "草稿"}
                          </Badge>
                          {doc.isFeatured && <Badge className="text-xs bg-amber-500">推荐</Badge>}
                        </div>
                        <h3 className="font-semibold">{doc.titleZh}</h3>
                        {doc.titleEn && <p className="text-xs text-muted-foreground mt-0.5">{doc.titleEn}</p>}
                        {doc.titleLocal && <p className="text-xs text-muted-foreground">{doc.titleLocal}</p>}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          {doc.documentNumber && <span className="font-mono">{doc.documentNumber}</span>}
                          {doc.issuingBody && <span>{doc.issuingBody}</span>}
                          {doc.issueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              颁布: {new Date(doc.issueDate).toLocaleDateString("zh-CN")}
                            </span>
                          )}
                          {doc.effectiveDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              生效: {new Date(doc.effectiveDate).toLocaleDateString("zh-CN")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEditDoc(doc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc.id)} disabled={deleteDoc.isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <EditDocDialog
        doc={editDoc}
        onClose={() => setEditDoc(null)}
        onSaved={() => {
          setEditDoc(null);
          queryClient.invalidateQueries({ queryKey: getGetLegalDocumentsQueryKey({} as any) });
        }}
      />
    </div>
  );
}

function EditDocDialog({ doc, onClose, onSaved }: { doc: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(null);

  if (!doc && !form) return null;
  if (!form && doc) {
    setTimeout(() => setForm({ ...doc, issueDate: doc.issueDate ? doc.issueDate.slice(0, 10) : "", effectiveDate: doc.effectiveDate ? doc.effectiveDate.slice(0, 10) : "", tags: Array.isArray(doc.tags) ? doc.tags.join(", ") : (doc.tags ?? "") }), 0);
    return null;
  }
  if (!doc) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: typeof form.tags === "string" ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : form.tags,
        issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : undefined,
        effectiveDate: form.effectiveDate ? new Date(form.effectiveDate).toISOString() : undefined,
      };
      const res = await fetch(`${BASE}/api/admin/legal-documents/${doc.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "已保存" });
      onSaved();
    } catch {
      toast({ title: "保存失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const f = form ?? doc;

  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>编辑法律条文</DialogTitle></DialogHeader>
        <div className="space-y-3 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { k: "titleZh", label: "中文标题 *" },
              { k: "titleEn", label: "英文标题" },
              { k: "titleLocal", label: "当地语言标题" },
              { k: "slug", label: "Slug" },
              { k: "documentNumber", label: "文号/编号" },
              { k: "issuingBody", label: "颁发机构" },
            ].map(({ k, label }) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input className="h-8 text-sm" value={f[k] ?? ""} onChange={set(k)} />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">所属国家 *</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={f.country ?? ""} onChange={set("country")}>
                <option value="">选择国家...</option>
                {ASEAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">文件类型</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={f.documentType ?? ""} onChange={set("documentType")}>
                <option value="">选择类型...</option>
                {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">法律领域</Label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={f.category ?? ""} onChange={set("category")}>
                <option value="">选择领域...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">颁布日期</Label>
              <Input type="date" className="h-8 text-sm" value={f.issueDate ?? ""} onChange={set("issueDate")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">生效日期</Label>
              <Input type="date" className="h-8 text-sm" value={f.effectiveDate ?? ""} onChange={set("effectiveDate")} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">标签（逗号分隔）</Label>
              <Input className="h-8 text-sm" value={typeof f.tags === "string" ? f.tags : (Array.isArray(f.tags) ? f.tags.join(", ") : "")} onChange={set("tags")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">中文全文</Label>
            <Textarea rows={5} className="text-sm" value={f.contentZh ?? ""} onChange={set("contentZh")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">英文全文</Label>
            <Textarea rows={3} className="text-sm" value={f.contentEn ?? ""} onChange={set("contentEn")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">当地语言全文</Label>
            <Textarea rows={3} className="text-sm" value={f.contentLocal ?? ""} onChange={set("contentLocal")} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={Boolean(f.isFeatured)} onChange={(e) => setForm((p: any) => ({ ...p, isFeatured: e.target.checked }))} className="accent-primary h-4 w-4" />
              推荐显示
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={Boolean(f.isPublished)} onChange={(e) => setForm((p: any) => ({ ...p, isPublished: e.target.checked }))} className="accent-primary h-4 w-4" />
              已发布
            </label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={handleSave} disabled={loading}>{loading ? "保存中..." : "保存修改"}</Button>
          <Button variant="outline" onClick={onClose}>取消</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
