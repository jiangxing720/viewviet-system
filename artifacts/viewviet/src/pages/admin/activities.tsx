import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetActivities, getGetActivitiesQueryKey,
  useApproveActivity,
  useRejectActivity,
  useCreateActivity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Calendar, MapPin, Users, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const CATEGORIES = ["文化", "户外", "商务", "美食", "语言交流", "志愿者", "教育", "娱乐"];

export default function AdminActivities() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"pending" | "all" | "create">("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allData, isLoading: allLoading } = useGetActivities(
    {},
    { query: { queryKey: getGetActivitiesQueryKey({}) } },
  );
  const approveActivity = useApproveActivity();
  const rejectActivity = useRejectActivity();
  const createActivity = useCreateActivity();

  const allActivities = (allData as any[]) ?? [];
  const pending = allActivities.filter((a: any) => !a.isPublished);
  const published = allActivities.filter((a: any) => a.isPublished);

  const form = useForm({
    defaultValues: {
      title: "", description: "", category: "", location: "", organizerName: "",
      organizerContact: "", coverImage: "", maxParticipants: 20, isFeatured: false,
      startTime: "", endTime: "",
    },
  });

  const handleApprove = (id: number) => {
    approveActivity.mutate({ id }, {
      onSuccess: () => { toast({ title: t("admin.approve") + " ✓" }); queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    rejectActivity.mutate({ id }, {
      onSuccess: () => { toast({ title: t("admin.reject") + " ✓" }); queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      data: {
        ...values,
        maxParticipants: Number(values.maxParticipants),
        isFeatured: Boolean((values as any).isFeatured),
        isPublished: true,
        startTime: values.startTime ? new Date(values.startTime).toISOString() : undefined,
        endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
      },
    };
    createActivity.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: "Activity published ✓" });
        form.reset();
        setTab("all");
        queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey({}) });
      },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  });

  const displayActivities = tab === "pending" ? pending : published;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{t("admin.dashboard")}</Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.activities")}</h1>
        {pending.length > 0 && (
          <Badge variant="destructive" className="ml-1">{pending.length} pending</Badge>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setTab("create")}>
          <Plus className="w-4 h-4 mr-1" />{t("admin.add")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "pending" as const, label: `Pending Review${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { id: "all" as const, label: `Published (${published.length})` },
          { id: "create" as const, label: "Publish New" },
        ].map(item => (
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

      {/* Create Form */}
      {tab === "create" && (
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Title *</FormLabel><FormControl><Input {...field} placeholder="Activity title in Chinese" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{t("learn.category")}</FormLabel><FormControl>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" {...field}>
                      <option value="">Select...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel><MapPin className="inline h-3 w-3 mr-1" />Location</FormLabel><FormControl><Input {...field} placeholder="Address or venue" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel><Calendar className="inline h-3 w-3 mr-1" />Start Time</FormLabel><FormControl><Input {...field} type="datetime-local" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel><Clock className="inline h-3 w-3 mr-1" />End Time</FormLabel><FormControl><Input {...field} type="datetime-local" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="organizerName" render={({ field }) => (
                  <FormItem><FormLabel>Organizer Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="organizerContact" render={({ field }) => (
                  <FormItem><FormLabel>Organizer Contact</FormLabel><FormControl><Input {...field} placeholder="WeChat / Email" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="coverImage" render={({ field }) => (
                  <FormItem><FormLabel>Cover Image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxParticipants" render={({ field }) => (
                  <FormItem><FormLabel><Users className="inline h-3 w-3 mr-1" />Max Participants</FormLabel><FormControl><Input {...field} type="number" min={1} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isFeatured" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-span-2">
                    <FormControl><input type="checkbox" checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 accent-primary" /></FormControl>
                    <FormLabel className="!mt-0">Featured activity</FormLabel>
                  </FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={createActivity.isPending}>
                    {createActivity.isPending ? t("common.loading") : "Publish Activity"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { form.reset(); setTab("pending"); }}>{t("admin.cancel")}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Activity list */}
      {(tab === "pending" || tab === "all") && (
        <>
          {allLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : displayActivities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {tab === "pending" ? (
                <>
                  <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No pending activities to review.</p>
                </>
              ) : (
                <>
                  <p>No published activities yet.</p>
                  <Button size="sm" className="mt-3" onClick={() => setTab("create")}>
                    <Plus className="w-4 h-4 mr-1" />Publish First Activity
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayActivities.map((activity: any) => (
                <Card key={activity.id} className={tab === "pending" ? "border-orange-200 bg-orange-50/30 dark:border-orange-900/30 dark:bg-orange-950/10" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {activity.coverImage && (
                        <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0 hidden sm:block" style={{ backgroundImage: `url(${activity.coverImage})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {activity.category && <Badge variant="secondary" className="text-xs">{activity.category}</Badge>}
                              <Badge variant={activity.isPublished ? "default" : "outline"} className="text-xs">
                                {activity.isPublished ? t("admin.publish") : "Pending"}
                              </Badge>
                              {activity.isFeatured && <Badge className="text-xs bg-amber-500">Featured</Badge>}
                            </div>
                            <h3 className="font-semibold line-clamp-1">{activity.title}</h3>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                            )}
                          </div>
                          {tab === "pending" && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button size="sm" onClick={() => handleApprove(activity.id)}
                                disabled={approveActivity.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white gap-1">
                                <Check className="w-3.5 h-3.5" />{t("admin.approve")}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(activity.id)}
                                disabled={rejectActivity.isPending} className="gap-1">
                                <X className="w-3.5 h-3.5" />{t("admin.reject")}
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          {activity.startTime && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(activity.startTime).toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}
                              {" "}{new Date(activity.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {activity.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activity.location}</span>}
                          {activity.maxParticipants && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{activity.currentParticipants ?? 0}/{activity.maxParticipants} spots
                            </span>
                          )}
                          {activity.organizerName && <span>By: {activity.organizerName}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
