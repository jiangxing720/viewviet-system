import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetActivity, getGetActivityQueryKey } from "@workspace/api-client-react";
import { Calendar, MapPin, Users, ArrowLeft, Phone, User } from "lucide-react";

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);

  const { data: activity, isLoading, isError } = useGetActivity(activityId, {
    query: { queryKey: getGetActivityQueryKey(activityId), enabled: !!activityId },
  });

  const a = activity as any;

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
        <p className="text-lg">Activity not found.</p>
        <Link href="/community"><Button variant="ghost" className="mt-4">← Back to Community</Button></Link>
      </div>
    );
  }

  const spotsLeft = a.maxParticipants ? a.maxParticipants - a.currentParticipants : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8" data-testid="page-activity-detail">
      <Link href="/community">
        <Button variant="ghost" size="sm" data-testid="button-back-community"><ArrowLeft className="w-4 h-4 mr-1" />Back to Community</Button>
      </Link>

      {a.coverImage && (
        <div className="w-full h-72 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${a.coverImage})` }} data-testid="img-activity-cover" />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {a.category && <Badge>{a.category}</Badge>}
          {a.isFeatured && <Badge variant="secondary">Featured</Badge>}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-snug" data-testid="text-activity-title">{a.title}</h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {a.startTime && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Date & Time</p>
                <p className="text-sm font-medium">{new Date(a.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {a.location && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Location</p>
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
                <p className="text-xs text-muted-foreground font-medium">Participants</p>
                <p className="text-sm font-medium">{a.currentParticipants} / {a.maxParticipants}</p>
                {spotsLeft !== null && <p className={`text-xs ${isFull ? "text-destructive" : "text-muted-foreground"}`}>{isFull ? "Full" : `${spotsLeft} spots left`}</p>}
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Organizer</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{a.organizerName}</p>
                {a.organizerContact && <p className="text-sm text-muted-foreground">{a.organizerContact}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join button */}
      <div className="flex gap-3 pt-4 border-t">
        <Button size="lg" disabled={isFull} className="flex-1" data-testid="button-join-activity">
          {isFull ? "Activity Full" : "Join Activity"}
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/community">Browse More</Link>
        </Button>
      </div>
    </div>
  );
}
