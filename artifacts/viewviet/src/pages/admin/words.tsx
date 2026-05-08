import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetWords, getGetWordsQueryKey,
  useCreateWord,
  useDeleteWord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const LANGS = ["vi", "en", "zh", "ko"];

export default function AdminWords() {
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("vi");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
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
        toast({ title: "Word created" });
        setShowForm(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({ language_code: lang }) });
      },
      onError: () => toast({ title: "Failed to create word", variant: "destructive" }),
    });
  });

  const handleDelete = (id: number) => {
    deleteWord.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Word deleted" });
        queryClient.invalidateQueries({ queryKey: getGetWordsQueryKey({ language_code: lang }) });
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
        <h1 className="text-2xl font-bold">Word Management</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="ml-auto" data-testid="button-add-word">
          <Plus className="w-4 h-4 mr-1" />Add Word
        </Button>
      </div>

      {showForm && (
        <Card data-testid="form-create-word">
          <CardHeader><CardTitle className="text-base">Add New Word</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="word" render={({ field }) => (
                  <FormItem><FormLabel>Word *</FormLabel><FormControl><Input {...field} placeholder="e.g. Xin chào" data-testid="input-word" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="languageCode" render={({ field }) => (
                  <FormItem><FormLabel>Language</FormLabel><FormControl>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field} data-testid="select-language">
                      {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pronunciation" render={({ field }) => (
                  <FormItem><FormLabel>Pronunciation</FormLabel><FormControl><Input {...field} placeholder="Phonetic" data-testid="input-pronunciation" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} placeholder="e.g. 日常用语" data-testid="input-category" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meaningZh" render={({ field }) => (
                  <FormItem><FormLabel>Chinese Meaning</FormLabel><FormControl><Input {...field} data-testid="input-meaning-zh" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="meaningEn" render={({ field }) => (
                  <FormItem><FormLabel>English Meaning</FormLabel><FormControl><Input {...field} data-testid="input-meaning-en" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="exampleSentence" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Example Sentence</FormLabel><FormControl><Input {...field} data-testid="input-example" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="exampleTranslation" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Example Translation (ZH)</FormLabel><FormControl><Input {...field} data-testid="input-example-translation" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createWord.isPending} data-testid="button-submit-word">
                    {createWord.isPending ? "Saving..." : "Save Word"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {LANGS.map((l) => (
          <button
            key={l}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => { setLang(l); setPage(1); }}
            data-testid={`tab-lang-${l}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search words..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search" />
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
                    <th className="text-left px-4 py-3 font-medium">ZH Meaning</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {words.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No words found</td></tr>
                  ) : words.map((w: any) => (
                    <tr key={w.id} className="border-b hover:bg-muted/30 transition-colors" data-testid={`row-word-${w.id}`}>
                      <td className="px-4 py-3 font-medium">{w.word}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{w.pronunciation ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{w.meaningZh ?? "—"}</td>
                      <td className="px-4 py-3">{w.category ? <Badge variant="secondary" className="text-xs">{w.category}</Badge> : "—"}</td>
                      <td className="px-4 py-3"><Badge variant={w.isPublished ? "default" : "outline"} className="text-xs">{w.isPublished ? "Published" : "Draft"}</Badge></td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(w.id)} disabled={deleteWord.isPending} data-testid={`button-delete-${w.id}`}>
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
          <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
