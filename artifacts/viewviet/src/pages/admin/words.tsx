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
  useGetWords, getGetWordsQueryKey,
  useCreateWord,
  useDeleteWord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search, Upload, Pencil, CheckCircle2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LANGS = ["vi", "en", "zh", "ko"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CSV_HEADERS = ["word", "languageCode", "pronunciation", "meaningZh", "meaningEn", "meaningVi", "category", "difficulty", "isPublished"];
const CSV_EXAMPLE = `word,languageCode,pronunciation,meaningZh,meaningEn,meaningVi,category,difficulty,isPublished
Xin chào,vi,sin chào,你好,Hello,Xin chào,日常用语,1,true
Cảm ơn,vi,gảm ơn,谢谢,Thank you,Cảm ơn,日常用语,1,true`;

function parseCsv(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const row: Record<string, any> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    if (row.difficulty) row.difficulty = Number(row.difficulty) || 1;
    if (row.isPublished !== undefined) row.isPublished = row.isPublished === "true";
    return row;
  });
}

export default function AdminWords() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("vi");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"list" | "add" | "bulk">("list");
  const [editWord, setEditWord] = useState<any | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ inserted: number; errors: any[] } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wordsResp, isLoading } = useGetWords(
    { language_code: lang, search: search || undefined, page, limit: 20 },
    { query: { queryKey: getGetWordsQueryKey({ language_code: lang, search: search || undefined, page, limit: 20 }) } },
  );
  const createWord = useCreateWord();
  const deleteWord = useDeleteWord();

  const words = (wordsResp as any)?.data ?? [];
  const pagination = (wordsResp as any)?.pagination;

  const form = useForm({
    defaultValues: {
      word: "", languageCode: "vi", pronunciation: "", meaningZh: "", meaningEn: "", meaningVi: "",
      category: "", exampleSentence: "", exampleTranslation: "", difficulty: 1, isPublished: false,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createWord.mutate({ data: values as any }, {
      onSuccess: () => {
        toast({ title: t("admin.save") + " ✓" });
        setActiveTab("list");
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({ language_code: lang }) });
      },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  });

  const handleDelete = (id: number) => {
    deleteWord.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("admin.delete") + " ✓" });
        queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({ language_code: lang }) });
      },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleBulkUpload = async () => {
    if (!bulkText.trim()) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const rows = parseCsv(bulkText);
      const res = await fetch(`${BASE}/api/admin/words/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setBulkResult(data);
      if (data.inserted > 0) {
        toast({ title: `${data.inserted} ${t("admin.words")} imported` });
        queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({}) });
      }
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{t("admin.dashboard")}</Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.words")}</h1>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant={activeTab === "bulk" ? "default" : "outline"} onClick={() => setActiveTab("bulk")}>
            <Upload className="w-4 h-4 mr-1" />{t("admin.bulk_upload")}
          </Button>
          <Button size="sm" onClick={() => { form.reset(); setActiveTab("add"); }}>
            <Plus className="w-4 h-4 mr-1" />{t("admin.add")}
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {activeTab === "add" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("admin.add")}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveTab("list")}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="word" render={({ field }) => (
                  <FormItem><FormLabel>{t("learn.words")} *</FormLabel><FormControl><Input {...field} placeholder="e.g. Xin chào" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="languageCode" render={({ field }) => (
                  <FormItem><FormLabel>{t("learn.words")}</FormLabel><FormControl>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field}>
                      {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pronunciation" render={({ field }) => (
                  <FormItem><FormLabel>Pronunciation</FormLabel><FormControl><Input {...field} placeholder="Phonetic" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{t("learn.category")}</FormLabel><FormControl><Input {...field} placeholder="e.g. 日常用语" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meaningZh" render={({ field }) => (
                  <FormItem><FormLabel>中文释义</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meaningEn" render={({ field }) => (
                  <FormItem><FormLabel>English Meaning</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meaningVi" render={({ field }) => (
                  <FormItem><FormLabel>Nghĩa tiếng Việt</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>{t("learn.difficulty")} (1-5)</FormLabel><FormControl>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field} onChange={e => field.onChange(Number(e.target.value))}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="exampleSentence" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Example Sentence</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="exampleTranslation" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Example Translation (ZH)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isPublished" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-span-2">
                    <FormControl><input type="checkbox" checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 accent-primary" /></FormControl>
                    <FormLabel className="!mt-0">Publish immediately</FormLabel>
                  </FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createWord.isPending}>
                    {createWord.isPending ? t("common.loading") : t("admin.save")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("list")}>{t("admin.cancel")}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload */}
      {activeTab === "bulk" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("admin.bulk_upload")} — CSV</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveTab("list")}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-md p-3">
              <p className="text-xs font-mono text-muted-foreground whitespace-pre">{CSV_EXAMPLE}</p>
            </div>
            <div className="space-y-1.5">
              <Label>CSV Data (include header row)</Label>
              <Textarea
                rows={10}
                placeholder={CSV_EXAMPLE}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-3 items-center">
              <Button onClick={handleBulkUpload} disabled={bulkLoading || !bulkText.trim()}>
                <Upload className="w-4 h-4 mr-1" />
                {bulkLoading ? t("common.loading") : "Import"}
              </Button>
              <Button variant="outline" onClick={() => setBulkText(CSV_EXAMPLE)}>Load Example</Button>
            </div>
            {bulkResult && (
              <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${bulkResult.inserted > 0 ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{bulkResult.inserted} words imported successfully</p>
                  {bulkResult.errors?.length > 0 && (
                    <p className="text-xs mt-1">{bulkResult.errors.length} row(s) skipped due to validation errors</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {activeTab === "list" && (
        <>
          <div className="flex gap-3 flex-wrap">
            {LANGS.map((l) => (
              <button
                key={l}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                onClick={() => { setLang(l); setPage(1); }}
              >
                {l.toUpperCase()}
              </button>
            ))}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t("common.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
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
                        <th className="text-left px-4 py-3 font-medium">Word</th>
                        <th className="text-left px-4 py-3 font-medium">Pronunciation</th>
                        <th className="text-left px-4 py-3 font-medium">中文释义</th>
                        <th className="text-left px-4 py-3 font-medium">{t("learn.category")}</th>
                        <th className="text-left px-4 py-3 font-medium">{t("common.status")}</th>
                        <th className="text-left px-4 py-3 font-medium">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {words.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("common.no_results")}</td></tr>
                      ) : words.map((w: any) => (
                        <tr key={w.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{w.word}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{w.pronunciation ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{w.meaningZh ?? "—"}</td>
                          <td className="px-4 py-3">{w.category ? <Badge variant="secondary" className="text-xs">{w.category}</Badge> : "—"}</td>
                          <td className="px-4 py-3"><Badge variant={w.isPublished ? "default" : "outline"} className="text-xs">{w.isPublished ? t("admin.publish") : "Draft"}</Badge></td>
                          <td className="px-4 py-3 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-7 h-7"
                              onClick={() => setEditWord(w)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(w.id)} disabled={deleteWord.isPending}>
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
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <EditWordDialog
        word={editWord}
        onClose={() => setEditWord(null)}
        onSaved={() => {
          setEditWord(null);
          queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({ language_code: lang }) });
        }}
      />
    </div>
  );
}

function EditWordDialog({ word, onClose, onSaved }: { word: any; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useState(() => {
    if (word) setForm({ ...word });
  });

  if (!word) return null;

  const initial = word;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev: any) => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/words/${initial.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form ?? initial),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: t("admin.save") + " ✓" });
      onSaved();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const current = form ?? initial;

  return (
    <Dialog open={!!word} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("admin.edit")} Word</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          {["word", "pronunciation", "meaningZh", "meaningEn", "meaningVi", "category", "exampleSentence", "exampleTranslation"].map(k => (
            <div key={k} className={`space-y-1 ${k === "exampleSentence" || k === "exampleTranslation" ? "col-span-2" : ""}`}>
              <Label className="text-xs capitalize">{k}</Label>
              <Input className="text-sm h-8" value={current[k] ?? ""} onChange={set(k)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">{t("learn.difficulty")}</Label>
            <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={current.difficulty ?? 1} onChange={set("difficulty")}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" id="ep-pub" checked={Boolean(current.isPublished)} onChange={e => setForm((p: any) => ({ ...p, isPublished: e.target.checked }))} className="accent-primary" />
            <Label htmlFor="ep-pub" className="text-sm !mt-0">Published</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={handleSave} disabled={loading}>{loading ? t("common.loading") : t("common.save_changes")}</Button>
          <Button variant="outline" onClick={onClose}>{t("admin.cancel")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
