import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetActivity, getGetActivityQueryKey } from "@workspace/api-client-react";
import { Calendar, MapPin, Users, ArrowLeft, Phone, User, Share2, CheckCircle2, Loader2 } from "lucide-react";
import { ActivityPosterModal } from "@/components/ActivityPoster";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const [posterOpen, setPosterOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activity, isLoading, isError } = useGetActivity(activityId, {
    query: { queryKey: getGetActivityQueryKey(activityId), enabled: !!activityId },
  });

  const a = activity as any;

  const handleJoin = async () => {
    if (joining || joined) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/join`, { method: "POST" });
      if (res.status === 409) {
        toast({ title: "名额已满，无法报名", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error ?? "报名失败，请稍后再试", variant: "destructive" });
        return;
      }
      setJoined(true);
      toast({ title: "报名成功！期待你的参与" });
      queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey(activityId) });
    } catch {
      toast({ title: "网络错误，请重试", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (isError || !a) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">活动不存在</p>
        <Link href="/community"><Button variant="ghost" className="mt-4">← 返回社区</Button></Link>
      </div>
    );
  }

  const spotsLeft = a.maxParticipants ? a.maxParticipants - (a.currentParticipants ?? 0) : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8" data-testid="page-activity-detail">
      <div className="flex items-center gap-2">
        <Link href="/community">
          <Button variant="ghost" size="sm" data-testid="button-back-community">
            <ArrowLeft className="w-4 h-4 mr-1" />返回社区
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => setPosterOpen(true)}
        >
          <Share2 className="w-4 h-4" />
          生成宣传海报
        </Button>
      </div>

      {a.coverImage && (
        <div
          className="w-full h-72 rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${a.coverImage})` }}
          data-testid="img-activity-cover"
        />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {a.category && <Badge>{a.category}</Badge>}
          {a.isFeatured && <Badge variant="secondary">推荐活动</Badge>}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-snug" data-testid="text-activity-title">
          {a.title}
        </h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {a.startTime && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">时间</p>
                <p className="text-sm font-medium">
                  {new Date(a.startTime).toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {a.location && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">地点</p>
                <p className="text-sm font-medium">{a.location}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {a.maxParticipants && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">参与人数</p>
                <p className="text-sm font-medium">{a.currentParticipants ?? 0} / {a.maxParticipants}</p>
                {spotsLeft !== null && (
                  <p className={`text-xs ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
                    {isFull ? "名额已满" : `还剩 ${spotsLeft} 个名额`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {a.description && (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-base leading-relaxed">{a.description}</p>
        </div>
      )}

      {/* Organizer */}
      {a.organizerName && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">主办方</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{a.organizerName}</p>
                {a.organizerContact && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />{a.organizerContact}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t flex-wrap">
        {joined ? (
          <Button size="lg" className="flex-1 gap-2 bg-green-600 hover:bg-green-600 cursor-default" disabled>
            <CheckCircle2 className="w-5 h-5" />
            已成功报名
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={isFull || joining}
            className="flex-1 gap-2"
            onClick={handleJoin}
            data-testid="button-join-activity"
          >
            {joining && <Loader2 className="w-4 h-4 animate-spin" />}
            {isFull ? "名额已满" : joining ? "报名中…" : "立即报名"}
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={() => setPosterOpen(true)} className="gap-1.5">
          <Share2 className="w-4 h-4" />
          分享海报
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/community">浏览更多</Link>
        </Button>
      </div>

      {/* Poster modal */}
      <ActivityPosterModal
        activity={a}
        open={posterOpen}
        onClose={() => setPosterOpen(false)}
      />
    </div>
  );
}
