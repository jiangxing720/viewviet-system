import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetActivities, getGetActivitiesQueryKey,
  useApproveActivity,
  useRejectActivity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Calendar, MapPin, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminActivities() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allData, isLoading: allLoading } = useGetActivities(
    {},
    { query: { queryKey: getGetActivitiesQueryKey({}) } },
  );
  const approveActivity = useApproveActivity();
  const rejectActivity = useRejectActivity();

  const allActivities = (allData as any[]) ?? [];
  const pending = allActivities.filter((a: any) => !a.isPublished);
  const published = allActivities.filter((a: any) => a.isPublished);

  const handleApprove = (id: number) => {
    approveActivity.mutate({ id }, {
      onSuccess: () => { toast({ title: "Activity approved" }); queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    rejectActivity.mutate({ id }, {
      onSuccess: () => { toast({ title: "Activity rejected" }); queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey({}) }); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const displayActivities = tab === "pending" ? pending : published;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
        <h1 className="text-2xl font-bold">Activity Moderation</h1>
        {pending.length > 0 && (
          <Badge variant="destructive" className="ml-2">{pending.length} pending</Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "pending" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          onClick={() => setTab("pending")}
          data-testid="tab-pending"
        >
          Pending Review {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          onClick={() => setTab("all")}
          data-testid="tab-all"
        >
          Published ({published.length})
        </button>
      </div>

      {allLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : displayActivities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {tab === "pending" ? (
            <>
              <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending activities. All caught up!</p>
            </>
          ) : (
            <p>No published activities yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayActivities.map((activity: any) => (
            <Card key={activity.id} className={tab === "pending" ? "border-orange-200 bg-orange-50/30 dark:border-orange-900/30 dark:bg-orange-950/10" : ""} data-testid={`card-activity-${activity.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {activity.coverImage && (
                    <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${activity.coverImage})` }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {activity.category && <Badge variant="secondary" className="text-xs">{activity.category}</Badge>}
                          <Badge variant={activity.isPublished ? "default" : "outline"} className="text-xs">{activity.isPublished ? "Published" : "Pending"}</Badge>
                        </div>
                        <h3 className="font-semibold line-clamp-1">{activity.title}</h3>
                        {activity.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>}
                      </div>
                      {tab === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(activity.id)}
                            disabled={approveActivity.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid={`button-approve-${activity.id}`}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(activity.id)}
                            disabled={rejectActivity.isPending}
                            data-testid={`button-reject-${activity.id}`}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      {activity.startTime && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(activity.startTime).toLocaleDateString()}</span>
                      )}
                      {activity.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activity.location}</span>
                      )}
                      {activity.maxParticipants && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activity.currentParticipants}/{activity.maxParticipants}</span>
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
    </div>
  );
}
