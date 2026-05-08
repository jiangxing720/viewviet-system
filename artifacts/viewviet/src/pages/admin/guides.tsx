import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetTravelGuides, getGetTravelGuidesQueryKey,
  useCreateTravelGuide,
  useUpdateTravelGuide,
  useDeleteTravelGuide,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Search, Pencil, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export default function AdminGuides() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guidesResp, isLoading } = useGetTravelGuides(
    { search: search || undefined, page, limit: 15 },
    { query: { queryKey: getGetTravelGuidesQueryKey({ search: search || undefined, page, limit: 15 }) } },
  );
  const createGuide = useCreateTravelGuide();
  const updateGuide = useUpdateTravelGuide();
  const deleteGuide = useDeleteTravelGuide();

  const guides = (guidesResp as any)?.data ?? [];
  const pagination = (guidesResp as any)?.pagination;

  const form = useForm({
    defaultValues: { title: "", country: "越南", city: "", category: "", coverImage: "", budgetRange: "", isPublished: false, isFeatured: false },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); form.reset(); };

  const onSubmit = form.handleSubmit((values) => {
    const payload = { data: { ...values, isPublished: Boolean((values as any).isPublished), isFeatured: Boolean((values as any).isFeatured) } };
    if (editId) {
      updateGuide.mutate({ id: editId, ...payload } as any, {
        onSuccess: () => { toast({ title: "Guide updated" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      createGuide.mutate(payload as any, {
        onSuccess: () => { toast({ title: "Guide created" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  });

  const openEdit = (g: any) => {
    form.reset({ title: g.title, country: g.country ?? "越南", city: g.city ?? "", category: g.category ?? "", coverImage: g.coverImage ?? "", budgetRange: g.budgetRange ?? "", isPublished: g.isPublished, isFeatured: g.isFeatured });
    setEditId(g.id); setShowForm(true);
  };

  const handleDelete = (id: number) => {
    deleteGuide.mutate({ id }, {
      onSuccess: () => { toast({ title: "Deleted" }); queryClient.invalidateQueries({ queryKey: getGetTravelGuidesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
        <h1 className="text-2xl font-bold">Travel Guides</h1>
        <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="ml-auto" data-testid="button-add-guide">
          <Plus className="w-4 h-4 mr-1" />Add Guide
        </Button>
      </div>

      {showForm && (
        <Card data-testid="form-guide">
          <CardHeader><CardTitle className="text-base">{editId ? "Edit Guide" : "Add Guide"}</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Title *</FormLabel><FormControl><Input {...field} data-testid="input-title" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} data-testid="input-country" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} placeholder="e.g. 美食" data-testid="input-category" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="budgetRange" render={({ field }) => (
                  <FormItem><FormLabel>Budget Range</FormLabel><FormControl><Input {...field} placeholder="e.g. 200-500元/天" data-testid="input-budget" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="coverImage" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Cover Image URL</FormLabel><FormControl><Input {...field} data-testid="input-cover" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isPublished")} className="rounded" data-testid="checkbox-published" />Published
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isFeatured")} className="rounded" data-testid="checkbox-featured" />Featured
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createGuide.isPending || updateGuide.isPending} data-testid="button-submit-guide">
                    {(createGuide.isPending || updateGuide.isPending) ? "Saving..." : (editId ? "Update" : "Create")}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search guides..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search" />
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
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium">City</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Views</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No guides found</td></tr>
                  ) : guides.map((g: any) => (
                    <tr key={g.id} className="border-b hover:bg-muted/30" data-testid={`row-guide-${g.id}`}>
                      <td className="px-4 py-3 font-medium max-w-xs"><p className="line-clamp-1">{g.title}</p></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{g.city}</td>
                      <td className="px-4 py-3">{g.category ? <Badge variant="outline" className="text-xs">{g.category}</Badge> : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs"><span className="flex items-center gap-1"><Eye className="w-3 h-3" />{g.viewCount}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <Badge variant={g.isPublished ? "default" : "outline"} className="text-xs">{g.isPublished ? "Live" : "Draft"}</Badge>
                        {g.isFeatured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                      </div></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
