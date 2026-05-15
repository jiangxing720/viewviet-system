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
  useDeleteLawyer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Search, Pencil, Trash2 } from "lucide-react";
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
  const deleteLawyer = useDeleteLawyer();

  const lawyers = (data as any[]) ?? [];

  const form = useForm({
    defaultValues: {
      name: "", nameEn: "", nameVi: "", title: "", lawFirm: "",
      country: "越南", city: "", email: "", phone: "", whatsapp: "", wechat: "",
      bio: "", bioEn: "", photo: "",
      specialties: "", languages: "",
      isFeatured: false, isActive: true,
    },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); form.reset(); };

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      data: {
        ...values,
        photo: values.photo || undefined,
        specialties: values.specialties ? values.specialties.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        languages: values.languages ? values.languages.split(",").map((l) => l.trim()).filter(Boolean) : undefined,
        isFeatured: Boolean(values.isFeatured),
        isActive: Boolean(values.isActive),
      },
    };
    if (editId) {
      updateLawyer.mutate({ id: editId, data: payload as any }, {
        onSuccess: () => { toast({ title: "已更新" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLawyersQueryKey({}) }); },
        onError: (e: any) => toast({ title: "更新失败: " + (e?.message ?? ""), variant: "destructive" }),
      });
    } else {
      createLawyer.mutate({ data: payload as any }, {
        onSuccess: () => { toast({ title: "已创建" }); closeForm(); queryClient.invalidateQueries({ queryKey: getGetLawyersQueryKey({}) }); },
        onError: (e: any) => toast({ title: "创建失败: " + (e?.message ?? ""), variant: "destructive" }),
      });
    }
  });

  const openEdit = (l: any) => {
    form.reset({
      name: l.name ?? "",
      nameEn: l.nameEn ?? "",
      nameVi: l.nameVi ?? "",
      title: l.title ?? "",
      lawFirm: l.lawFirm ?? "",
      country: l.country ?? "越南",
      city: l.city ?? "",
      email: l.email ?? "",
      phone: l.phone ?? "",
      whatsapp: l.whatsapp ?? "",
      wechat: l.wechat ?? "",
      bio: l.bio ?? "",
      bioEn: l.bioEn ?? "",
      photo: l.photo ?? "",
      specialties: Array.isArray(l.specialties) ? l.specialties.join(", ") : "",
      languages: Array.isArray(l.languages) ? l.languages.join(", ") : "",
      isFeatured: l.isFeatured,
      isActive: l.isActive,
    });
    setEditId(l.id);
    setShowForm(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`确认删除律师「${name}」？此操作不可撤销。`)) return;
    deleteLawyer.mutate({ id } as any, {
      onSuccess: () => { toast({ title: "已删除" }); queryClient.invalidateQueries({ queryKey: getGetLawyersQueryKey({}) }); },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
        <h1 className="text-2xl font-bold">律师管理</h1>
        <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }} className="ml-auto" data-testid="button-add-lawyer">
          <Plus className="w-4 h-4 mr-1" />添加律师
        </Button>
      </div>

      {showForm && (
        <Card data-testid="form-lawyer">
          <CardHeader><CardTitle className="text-base">{editId ? "编辑律师" : "添加律师"}</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名（中文）*</FormLabel><FormControl><Input {...field} data-testid="input-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nameEn" render={({ field }) => (
                  <FormItem><FormLabel>姓名（英文）</FormLabel><FormControl><Input {...field} data-testid="input-name-en" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nameVi" render={({ field }) => (
                  <FormItem><FormLabel>姓名（越文）</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>职位/头衔</FormLabel><FormControl><Input {...field} placeholder="如：高级合伙人" data-testid="input-title" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lawFirm" render={({ field }) => (
                  <FormItem><FormLabel>律师事务所</FormLabel><FormControl><Input {...field} data-testid="input-firm" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>国家</FormLabel><FormControl><Input {...field} data-testid="input-country" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>城市</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="photo" render={({ field }) => (
                  <FormItem><FormLabel>头像图片URL</FormLabel><FormControl><Input {...field} placeholder="https://..." data-testid="input-photo" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>邮箱</FormLabel><FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>电话</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="wechat" render={({ field }) => (
                  <FormItem><FormLabel>微信号</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="specialties" render={({ field }) => (
                  <FormItem><FormLabel>专业领域（逗号分隔）</FormLabel><FormControl><Input {...field} placeholder="劳动法, 公司法, 知识产权" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="languages" render={({ field }) => (
                  <FormItem><FormLabel>语言能力（逗号分隔）</FormLabel><FormControl><Input {...field} placeholder="中文, 越南语, 英语" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>中文简介</FormLabel><FormControl><Input {...field} data-testid="input-bio" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bioEn" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>英文简介</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isFeatured")} className="rounded" data-testid="checkbox-featured" />推荐展示
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...form.register("isActive")} className="rounded" data-testid="checkbox-active" />激活状态
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createLawyer.isPending || updateLawyer.isPending} data-testid="button-submit-lawyer">
                    {(createLawyer.isPending || updateLawyer.isPending) ? "保存中..." : (editId ? "更新" : "创建")}
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
        <Input className="pl-9" placeholder="搜索律师..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
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
                    <th className="text-left px-4 py-3 font-medium">律师</th>
                    <th className="text-left px-4 py-3 font-medium">事务所</th>
                    <th className="text-left px-4 py-3 font-medium">地区</th>
                    <th className="text-left px-4 py-3 font-medium">联系方式</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="text-left px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无律师信息</td></tr>
                  ) : lawyers.map((l: any) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30" data-testid={`row-lawyer-${l.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {l.photo
                              ? <img src={l.photo} alt={l.name} className="w-8 h-8 object-cover rounded-full" />
                              : <span className="text-xs text-primary font-bold">{l.name[0]}</span>
                            }
                          </div>
                          <div>
                            <p className="font-medium">{l.name}</p>
                            <p className="text-xs text-muted-foreground">{l.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{l.lawFirm ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.city}{l.city && l.country ? ", " : ""}{l.country}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.email ?? l.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Badge variant={l.isActive ? "default" : "outline"} className="text-xs">{l.isActive ? "激活" : "停用"}</Badge>
                          {l.isFeatured && <Badge variant="secondary" className="text-xs">推荐</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(l)} data-testid={`button-edit-${l.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(l.id, l.name)}
                            disabled={deleteLawyer.isPending}
                            data-testid={`button-delete-${l.id}`}
                          >
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
    </div>
  );
}
