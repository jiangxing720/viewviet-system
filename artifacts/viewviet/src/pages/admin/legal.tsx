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
  useGetLegalArticles, getGetLegalArticlesQueryKey,
  useCreateLegalArticle,
  useUpdateLegalArticle,
  useDeleteLegalArticle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search, Pencil, Eye, X, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = ["劳动法", "公司注册", "知识产权", "税务", "FDI/投资", "房地产", "移民签证", "刑事"];
const COUNTRIES = ["越南", "泰国", "马来西亚", "新加坡", "印度尼西亚", "柬埔寨", "缅甸", "东南亚"];

export default function AdminLegal() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: articlesResp, isLoading } = useGetLegalArticles(
    { search: search || undefined, page, limit: 15 },
    { query: { queryKey: getGetLegalArticlesQueryKey({ search: search || undefined, page, limit: 15 }) } },
  );
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
      updateArticle.mutate({ id: editId, ...payload } as any, {
        onSuccess: () => { toast({ title: t("admin.save") + " ✓" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLegalArticlesQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      createArticle.mutate(payload as any, {
        onSuccess: () => { toast({ title: t("admin.add") + " ✓" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLegalArticlesQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
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
      onSuccess: () => { toast({ title: t("admin.delete") + " ✓" }); queryClient.invalidateQueries({ queryKey: getGetLegalArticlesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const titleValue = form.watch("title");
  const contentValue = form.watch("content");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{t("admin.dashboard")}</Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.legal")}</h1>
        <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="ml-auto">
          <Plus className="w-4 h-4 mr-1" />{t("admin.add")}
        </Button>
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
                    <FormItem><FormLabel>{t("learn.category")}</FormLabel><FormControl>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field}>
                        <option value="">Select category...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FormControl><FormMessage /></FormItem>
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
