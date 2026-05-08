import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetLawyers, getGetLawyersQueryKey,
  useCreateLawyer,
  useUpdateLawyer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Search, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export default function AdminLawyers() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetLawyers(
    { search: search || undefined },
    { query: { queryKey: getGetLawyersQueryKey({ search: search || undefined }) } },
  );
  const createLawyer = useCreateLawyer();
  const updateLawyer = useUpdateLawyer();

  const lawyers = (data as any[]) ?? [];

  const form = useForm({
    defaultValues: { name: "", nameEn: "", title: "", lawFirm: "", country: "越南", city: "", email: "", phone: "", bio: "", isFeatured: false, isActive: true },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); form.reset(); };

  const onSubmit = form.handleSubmit((values) => {
    const payload = { data: { ...values, isFeatured: Boolean((values as any).isFeatured), isActive: Boolean((values as any).isActive) } };
    if (editId) {
      updateLawyer.mutate({ id: editId, ...payload } as any, {
        onSuccess: () => { toast({ title: "Updated" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLawyersQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      createLawyer.mutate(payload as any, {
        onSuccess: () => { toast({ title: "Created" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLawyersQueryKey({}) }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  });

  const openEdit = (l: any) => {
    form.reset({ name: l.name, nameEn: l.nameEn ?? "", title: l.title ?? "", lawFirm: l.lawFirm ?? "", country: l.country ?? "越南", city: l.city ?? "", email: l.email ?? "", phone: l.phone ?? "", bio: l.bio ?? "", isFeatured: l.isFeatured, isActive: l.isActive });
    setEditId(l.id); setShowForm(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
        <h1 className="text-2xl font-bold">Lawyers</h1>
        <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="ml-auto" data-testid="button-add-lawyer">
          <Plus className="w-4 h-4 mr-1" />Add Lawyer
        </Button>
      </div>

      {showForm && (
        <Card data-testid="form-lawyer">
          <CardHeader><CardTitle className="text-base">{editId ? "Edit Lawyer" : "Add Lawyer"}</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name (Chinese) *</FormLabel><FormControl><Input {...field} data-testid="input-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nameEn" render={({ field }) => (
                  <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} data-testid="input-name-en" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="e.g. 高级合伙人" data-testid="input-title" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lawFirm" render={({ field }) => (
                  <FormItem><FormLabel>Law Firm</FormLabel><FormControl><Input {...field} data-testid="input-firm" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} data-testid="input-country" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Bio</FormLabel><FormControl><Input {...field} data-testid="input-bio" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isFeatured")} className="rounded" data-testid="checkbox-featured" />Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isActive")} className="rounded" data-testid="checkbox-active" />Active
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createLawyer.isPending || updateLawyer.isPending} data-testid="button-submit-lawyer">
                    {(createLawyer.isPending || updateLawyer.isPending) ? "Saving..." : (editId ? "Update" : "Create")}
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
        <Input className="pl-9" placeholder="Search lawyers..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Firm</th>
                    <th className="text-left px-4 py-3 font-medium">Location</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No lawyers found</td></tr>
                  ) : lawyers.map((l: any) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30" data-testid={`row-lawyer-${l.id}`}>
                      <td className="px-4 py-3"><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.title}</p></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{l.lawFirm ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.city}, {l.country}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.email ?? l.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Badge variant={l.isActive ? "default" : "outline"} className="text-xs">{l.isActive ? "Active" : "Inactive"}</Badge>
                          {l.isFeatured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(l)} data-testid={`button-edit-${l.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
