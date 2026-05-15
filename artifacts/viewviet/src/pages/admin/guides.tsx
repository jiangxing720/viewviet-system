import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetTravelGuides, getGetTravelGuidesQueryKey,
  useCreateTravelGuide,
  useUpdateTravelGuide,
  useDeleteTravelGuide,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search, Pencil, Eye, ChevronDown, ChevronUp, Link2, Loader2, Sparkles, UploadCloud, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FORM = {
  title: "",
  titleEn: "",
  country: "越南",
  city: "",
  category: "",
  coverImage: "",
  budgetRange: "",
  summary: "",
  content: "",
  mapEmbed: "",
  isPublished: false,
  isFeatured: false,
};

export default function AdminGuides() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isBatching, setIsBatching] = useState(false);
  const [batchResults, setBatchResults] = useState<{ succeeded: any[]; failed: any[] } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: guidesResp, isLoading } = useGetTravelGuides(
    { search: search || undefined, page, limit: 15 },
    { query: { queryKey: getGetTravelGuidesQueryKey({ search: search || undefined, page, limit: 15 }) } },
  );
  const createGuide = useCreateTravelGuide();
  const updateGuide = useUpdateTravelGuide();
  const deleteGuide = useDeleteTravelGuide();

  const guides = (guidesResp as any)?.data ?? [];
  const pagination = (guidesResp as any)?.pagination;

  const form = useForm({ defaultValues: DEFAULT_FORM });

  const closeForm = () => { setShowForm(false); setEditId(null); form.reset(DEFAULT_FORM); setShowAdvanced(false); };

  const onSubmit = form.handleSubmit((values) => {
    const body = {
      ...values,
      isPublished: Boolean((values as any).isPublished),
      isFeatured: Boolean((values as any).isFeatured),
      content: values.content || null,
      summary: values.summary || null,
      titleEn: values.titleEn || null,
      mapEmbed: values.mapEmbed || null,
    };
    if (editId) {
      updateGuide.mutate({ id: editId, data: body as any }, {
        onSuccess: () => { toast({ title: "攻略已更新" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
        onError: (e: any) => toast({ title: "保存失败: " + (e?.message ?? ""), variant: "destructive" }),
      });
    } else {
      createGuide.mutate({ data: body as any }, {
        onSuccess: () => { toast({ title: "攻略已创建" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
        onError: (e: any) => toast({ title: "保存失败: " + (e?.message ?? ""), variant: "destructive" }),
      });
    }
  });

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/guides/import-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "提取失败");
      form.reset({
        title: data.title ?? "",
        titleEn: data.titleEn ?? "",
        country: data.country ?? "越南",
        city: data.city ?? "",
        category: data.category ?? "",
        coverImage: data.coverImage ?? "",
        budgetRange: data.budgetRange ?? "",
        summary: data.summary ?? "",
        content: data.content ?? "",
        mapEmbed: "",
        isPublished: true,
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
      const res = await fetch(`${BASE}/api/admin/guides/batch-import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      setBatchResults(data);
      queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) });
    } catch (e: any) {
      toast({ title: e?.message ?? "批量导入失败", variant: "destructive" });
    } finally { setIsBatching(false); }
  };

  const openEdit = (g: any) => {
    form.reset({
      title: g.title ?? "",
      titleEn: g.titleEn ?? "",
      country: g.country ?? "越南",
      city: g.city ?? "",
      category: g.category ?? "",
      coverImage: g.coverImage ?? "",
      budgetRange: g.budgetRange ?? "",
      summary: g.summary ?? "",
      content: g.content ?? "",
      mapEmbed: g.mapEmbed ?? "",
      isPublished: g.isPublished,
      isFeatured: g.isFeatured,
    });
    setEditId(g.id);
    setShowForm(true);
    setShowAdvanced(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm("确认删除？")) return;
    deleteGuide.mutate({ id }, {
      onSuccess: () => { toast({ title: "已删除" }); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button></Link>
        <h1 className="text-2xl font-bold">旅游攻略</h1>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setBatchResults(null); setShowBatch(true); }}>
            <UploadCloud className="w-4 h-4 mr-1" />批量导入
          </Button>
          <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }} data-testid="button-add-guide">
            <Plus className="w-4 h-4 mr-1" />新建攻略
          </Button>
        </div>
      </div>

      {/* AI URL Import Panel */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI 智能导入</span>
          <span className="text-xs text-muted-foreground">粘贴公众号或旅游网站链接，AI 自动提取攻略全文</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-background"
              placeholder="粘贴攻略链接，例如 https://mp.weixin.qq.com/s/..."
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
        <Card data-testid="form-guide">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editId ? "编辑攻略" : "新建攻略"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Basic info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>标题（中文）*</FormLabel><FormControl><Input {...field} placeholder="例：河内老城区深度游" data-testid="input-title" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="titleEn" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>标题（英文）</FormLabel><FormControl><Input {...field} placeholder="Hanoi Old Quarter Guide" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel>国家</FormLabel><FormControl><Input {...field} data-testid="input-country" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>城市</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>分类</FormLabel><FormControl><Input {...field} placeholder="例：美食 / 购物 / 景点" data-testid="input-category" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="budgetRange" render={({ field }) => (
                    <FormItem><FormLabel>预算参考</FormLabel><FormControl><Input {...field} placeholder="例：200-500元/天" data-testid="input-budget" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="coverImage" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>封面图 URL</FormLabel><FormControl><Input {...field} placeholder="https://..." data-testid="input-cover" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                {/* Summary */}
                <FormField control={form.control} name="summary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>摘要（显示在列表页）</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="一两句话描述这篇攻略的亮点…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Content body */}
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>正文内容（支持 Markdown 格式）</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={12}
                        placeholder={`## 景点介绍\n\n河内老城区是....\n\n## 交通方式\n\n- 出租车：约30元\n- 步行：15分钟\n\n## 小贴士\n\n**注意**：营业时间为 8:00–22:00`}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持 Markdown：**粗体**、## 标题、- 列表、[链接](url)
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Advanced section toggle */}
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowAdvanced(v => !v)}
                >
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  高级选项（地图嵌入）
                </button>

                {showAdvanced && (
                  <FormField control={form.control} name="mapEmbed" render={({ field }) => (
                    <FormItem>
                      <FormLabel>地图嵌入代码（Google Maps iframe）</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder='<iframe src="https://www.google.com/maps/embed?..." />' className="font-mono text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isPublished")} className="rounded accent-primary" data-testid="checkbox-published" />
                    发布
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isFeatured")} className="rounded accent-primary" data-testid="checkbox-featured" />
                    首页推荐
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={createGuide.isPending || updateGuide.isPending} data-testid="button-submit-guide">
                    {(createGuide.isPending || updateGuide.isPending) ? "保存中…" : (editId ? "更新攻略" : "创建攻略")}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>取消</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="搜索攻略…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">标题</th>
                    <th className="text-left px-4 py-3 font-medium">城市</th>
                    <th className="text-left px-4 py-3 font-medium">分类</th>
                    <th className="text-left px-4 py-3 font-medium">正文</th>
                    <th className="text-left px-4 py-3 font-medium">浏览</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="text-left px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">暂无攻略</td></tr>
                  ) : guides.map((g: any) => (
                    <tr key={g.id} className="border-b hover:bg-muted/30" data-testid={`row-guide-${g.id}`}>
                      <td className="px-4 py-3 font-medium max-w-xs"><p className="line-clamp-1">{g.title}</p></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{g.city}</td>
                      <td className="px-4 py-3">{g.category ? <Badge variant="outline" className="text-xs">{g.category}</Badge> : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {g.content ? <span className="text-green-600 font-medium">有正文</span> : <span className="text-orange-500">无正文</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs"><span className="flex items-center gap-1"><Eye className="w-3 h-3" />{g.viewCount}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <Badge variant={g.isPublished ? "default" : "outline"} className="text-xs">{g.isPublished ? "已发布" : "草稿"}</Badge>
                        {g.isFeatured && <Badge variant="secondary" className="text-xs">推荐</Badge>}
                      </div></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <a href={`/guides/${g.id}`} target="_blank" rel="noopener">
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" title="查看攻略"><ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(g)} data-testid={`button-edit-${g.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(g.id)} data-testid={`button-delete-${g.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div></td>
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground">第 {page} / {pagination.totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
      {/* Batch Import Dialog */}
      <Dialog open={showBatch} onOpenChange={v => { if (!isBatching) setShowBatch(v); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UploadCloud className="w-5 h-5 text-primary" />批量导入旅游攻略</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">每行粘贴一个链接（公众号文章或旅游网页），AI 将依次提取全文并自动保存为草稿，完成后在列表中审核发布。</p>
            {!batchResults ? (
              <>
                <div className="space-y-1.5">
                  <Label>攻略链接（每行一个）</Label>
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
                      <p className="text-xs text-muted-foreground">每篇攻略约 15-30 秒，多篇请耐心等待...</p>
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
                  {batchResults.succeeded.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{r.title}</span>
                    </div>
                  ))}
                  {batchResults.failed.map((r: any, i: number) => (
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
    </div>
  );
}
