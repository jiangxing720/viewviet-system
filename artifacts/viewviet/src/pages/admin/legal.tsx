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
  useCreateLegalArticle,
  useUpdateLegalArticle,
  useDeleteLegalArticle,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search, Pencil, Eye, X, Globe, Sparkles, Link2, Loader2, UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = ["劳动法", "公司注册", "知识产权", "税务", "FDI/投资", "房地产", "移民签证", "刑事"];
const COUNTRIES = ["越南", "泰国", "马来西亚", "新加坡", "印度尼西亚", "柬埔寨", "缅甸", "东南亚"];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "劳动法": ["劳动", "劳工", "合同", "工资", "薪资", "员工", "雇佣", "就业", "工伤", "辞退", "解雇", "劳动合同", "社保", "工时"],
  "公司注册": ["注册", "公司", "企业", "设立", "章程", "营业执照", "股东", "董事", "有限公司", "法人"],
  "知识产权": ["知识产权", "专利", "商标", "版权", "著作权", "侵权", "知识", "产权", "品牌保护"],
  "税务": ["税", "纳税", "报税", "增值税", "所得税", "VAT", "税务", "退税", "税率", "税收", "发票"],
  "FDI/投资": ["投资", "FDI", "外资", "股权", "合资", "外商", "外国投资", "投资许可", "项目"],
  "房地产": ["房地产", "购房", "租赁", "土地", "产权", "不动产", "房产", "买房", "租房", "物业"],
  "移民签证": ["签证", "移民", "护照", "居留", "工作许可", "visa", "work permit", "居住证", "入境", "出境", "签注", "落地签"],
  "刑事": ["刑事", "犯罪", "逮捕", "刑法", "监狱", "拘留", "诈骗", "违法", "刑罚"],
};

function detectCategory(title: string, content: string): string {
  const text = (title + " " + content).toLowerCase();
  let best = "";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

export default function AdminLegal() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isBatching, setIsBatching] = useState(false);
  const [batchResults, setBatchResults] = useState<{ succeeded: any[]; failed: any[] } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const adminQKey = ["admin-legal-articles", search, page];
  const { data: articlesResp, isLoading } = useQuery({
    queryKey: adminQKey,
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) p.set("search", search);
      const res = await fetch(`${BASE}/api/admin/legal-articles?${p}`, { credentials: "include" });
      return res.json();
    },
  });
  const createArticle = useCreateLegalArticle();
  const updateArticle = useUpdateLegalArticle();
  const deleteArticle = useDeleteLegalArticle();

  const articles = (articlesResp as any)?.data ?? [];
  const pagination = (articlesResp as any)?.pagination;

  const form = useForm({
    defaultValues: {
      title: "", slug: "", summary: "", content: "", category: "", country: "越南",
      coverImage: "", isPublished: false, isFeatured: false,
    },
  });

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/-+/g, "-").slice(0, 80);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      data: {
        ...values,
        slug: values.slug || autoSlug(values.title),
        isPublished: Boolean((values as any).isPublished),
        isFeatured: Boolean((values as any).isFeatured),
      },
    };
    if (editId) {
      updateArticle.mutate({ id: editId, data: payload as any }, {
        onSuccess: () => { toast({ title: t("admin.save") + " ✓" }); closeForm(); queryClient.invalidateQueries({ queryKey: ["admin-legal-articles"] }); },
        onError: (e: any) => toast({ title: "Failed: " + (e?.message ?? ""), variant: "destructive" }),
      });
    } else {
      createArticle.mutate({ data: payload as any }, {
        onSuccess: () => { toast({ title: t("admin.add") + " ✓" }); closeForm(); queryClient.invalidateQueries({ queryKey: ["admin-legal-articles"] }); },
        onError: (e: any) => toast({ title: "Failed: " + (e?.message ?? ""), variant: "destructive" }),
      });
    }
  });

  const closeForm = () => { setShowForm(false); setEditId(null); form.reset(); };

  const openEdit = (a: any) => {
    form.reset({
      title: a.title, slug: a.slug, summary: a.summary ?? "", content: a.content ?? "",
      category: a.category ?? "", country: a.country ?? "越南", coverImage: a.coverImage ?? "",
      isPublished: a.isPublished, isFeatured: a.isFeatured,
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    deleteArticle.mutate({ id }, {
      onSuccess: () => { toast({ title: t("admin.delete") + " ✓" }); queryClient.invalidateQueries({ queryKey: ["admin-legal-articles"] }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/legal-articles/import-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "提取失败");
      form.reset({
        title: data.title ?? "",
        slug: autoSlug(data.title ?? ""),
        summary: data.summary ?? "",
        content: data.content ?? "",
        category: data.category ?? "",
        country: data.country ?? "越南",
        coverImage: data.coverImage ?? "",
        isPublished: false,
        isFeatured: false,
      });
      setEditId(null);
      setShowForm(true);
      setImportUrl("");
      toast({ title: "AI 提取成功，请检查内容后保存" });
    } catch (e: any) {
      toast({ title: e?.message ?? "提取失败", variant: "destructive" });
    } finally { setIsImporting(false); }
  };

  const handleBatchImport = async () => {
    const urls = batchUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setIsBatching(true);
    setBatchResults(null);
    try {
      const res = await fetch(`${BASE}/api/admin/legal-articles/batch-import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      setBatchResults(data);
      queryClient.invalidateQueries({ queryKey: ["admin-legal-articles"] });
    } catch (e: any) {
      toast({ title: e?.message ?? "批量导入失败", variant: "destructive" });
    } finally { setIsBatching(false); }
  };

  const titleValue = form.watch("title");
  const contentValue = form.watch("content");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{t("admin.dashboard")}</Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.legal")}</h1>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setBatchResults(null); setShowBatch(true); }}>
            <UploadCloud className="w-4 h-4 mr-1" />批量导入
          </Button>
          <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" />{t("admin.add")}
          </Button>
        </div>
      </div>

      {/* AI URL Import Panel */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI 智能导入</span>
          <span className="text-xs text-muted-foreground">粘贴公众号或资讯网页链接，AI 自动提取全文内容</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-background"
              placeholder="粘贴文章链接，例如 https://mp.weixin.qq.com/s/..."
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isImporting && handleImportUrl()}
              disabled={isImporting}
            />
          </div>
          <Button onClick={handleImportUrl} disabled={isImporting || !importUrl.trim()} className="gap-1.5 shrink-0">
            {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" />提取中...</> : <><Sparkles className="w-4 h-4" />AI 提取</>}
          </Button>
        </div>
        {isImporting && <p className="text-xs text-muted-foreground mt-2">正在抓取页面并调用 AI 提取全文，约 15-30 秒...</p>}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editId ? t("admin.edit") : t("admin.add")}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Article title in Chinese" onChange={e => { field.onChange(e); if (!editId) form.setValue("slug", autoSlug(e.target.value)); }} />
                      </FormControl><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Slug (URL)</FormLabel><FormControl><Input {...field} placeholder="auto-generated-from-title" className="font-mono text-xs" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="coverImage" render={({ field }) => (
                    <FormItem><FormLabel>Cover Image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{t("learn.category")}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 text-primary px-2"
                          onClick={() => {
                            const detected = detectCategory(form.getValues("title"), form.getValues("content") + " " + form.getValues("summary"));
                            if (detected) { form.setValue("category", detected); toast({ title: `${t("admin.auto_category")}: ${detected}` }); }
                            else toast({ title: "无法识别分类，请手动选择", variant: "destructive" });
                          }}
                        >
                          <Sparkles className="h-3 w-3" />{t("admin.auto_category")}
                        </Button>
                      </div>
                      <FormControl>
                        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field}>
                          <option value="">Select category...</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </FormControl><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel><Globe className="inline h-3 w-3 mr-1" />Country</FormLabel><FormControl>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field}>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="summary" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Summary</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="Brief summary for cards..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Rich Content Editor */}
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Content (Markdown)</FormLabel>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewContent(contentValue)} className="text-xs h-7">
                        <Eye className="h-3 w-3 mr-1" />Preview
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={16}
                        placeholder={`## 标题\n\n正文内容支持 Markdown 格式...\n\n### 子标题\n\n- 列表项\n- 列表项`}
                        className="font-mono text-xs leading-relaxed"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Supports Markdown: ## headings, **bold**, *italic*, - lists, [links](url)</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex items-center gap-6">
                  <FormField control={form.control} name="isPublished" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl><input type="checkbox" checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 accent-primary" /></FormControl>
                      <FormLabel className="!mt-0">{t("admin.publish")}</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isFeatured" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl><input type="checkbox" checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 accent-primary" /></FormControl>
                      <FormLabel className="!mt-0">Featured</FormLabel>
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={createArticle.isPending || updateArticle.isPending}>
                    {createArticle.isPending || updateArticle.isPending ? t("common.loading") : t("common.save_changes")}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>{t("admin.cancel")}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t("legal.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium">{t("learn.category")}</th>
                    <th className="text-left px-4 py-3 font-medium">Country</th>
                    <th className="text-left px-4 py-3 font-medium">{t("common.status")}</th>
                    <th className="text-left px-4 py-3 font-medium">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("common.no_results")}</td></tr>
                  ) : articles.map((a: any) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1">{a.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{a.slug}</p>
                      </td>
                      <td className="px-4 py-3">{a.category ? <Badge variant="secondary" className="text-xs">{a.category}</Badge> : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{a.country ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={a.isPublished ? "default" : "outline"} className="text-xs">{a.isPublished ? t("admin.publish") : "Draft"}</Badge>
                          {a.isFeatured && <Badge className="text-xs bg-amber-500 hover:bg-amber-600">Featured</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(a.id)} disabled={deleteArticle.isPending}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Batch Import Dialog */}
      <Dialog open={showBatch} onOpenChange={v => { if (!isBatching) setShowBatch(v); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UploadCloud className="w-5 h-5 text-primary" />批量导入法律文章</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">每行粘贴一个链接（公众号文章或法律资讯网页），AI 将依次提取全文并自动保存为草稿，完成后在列表中审核发布。</p>
            {!batchResults ? (
              <>
                <div className="space-y-1.5">
                  <Label>文章链接（每行一个）</Label>
                  <textarea
                    className="w-full h-40 rounded-md border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={"https://mp.weixin.qq.com/s/abc123\nhttps://mp.weixin.qq.com/s/def456\nhttps://..."}
                    value={batchUrls}
                    onChange={e => setBatchUrls(e.target.value)}
                    disabled={isBatching}
                  />
                  <p className="text-xs text-muted-foreground">{batchUrls.split("\n").filter(u => u.trim()).length} 个链接</p>
                </div>
                {isBatching && (
                  <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">AI 批量提取中，请勿关闭此窗口</p>
                      <p className="text-xs text-muted-foreground">每篇文章约 15-30 秒，多篇请耐心等待...</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleBatchImport} disabled={isBatching || !batchUrls.trim()} className="gap-2">
                    {isBatching ? <><Loader2 className="w-4 h-4 animate-spin" />导入中...</> : <><Sparkles className="w-4 h-4" />开始批量导入</>}
                  </Button>
                  <Button variant="outline" onClick={() => setShowBatch(false)} disabled={isBatching}>取消</Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-600">{batchResults.succeeded.length} 篇成功</span>
                  {batchResults.failed.length > 0 && <span className="text-sm font-medium text-destructive">{batchResults.failed.length} 篇失败</span>}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-md border p-3">
                  {batchResults.succeeded.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{r.title}</span>
                    </div>
                  ))}
                  {batchResults.failed.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-mono text-xs text-muted-foreground line-clamp-1">{r.url}</p>
                        <p className="text-xs text-destructive">{r.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">已保存为草稿，请在列表中审核内容后再发布。</p>
                <div className="flex gap-3">
                  <Button onClick={() => { setBatchUrls(""); setBatchResults(null); setShowBatch(false); }}>完成</Button>
                  <Button variant="outline" onClick={() => setBatchResults(null)}>继续导入</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Markdown Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={v => !v && setPreviewContent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Content Preview</DialogTitle></DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed border rounded-md p-4 bg-muted/30 font-mono">
            {previewContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
