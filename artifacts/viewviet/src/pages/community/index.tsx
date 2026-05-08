import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetActivities, getGetActivitiesQueryKey } from "@workspace/api-client-react";
import { Calendar, MapPin, Users, Plus } from "lucide-react";

const CATEGORIES = ["文化", "户外", "商务", "美食", "语言交流", "志愿者"];

export default function Community() {
  const [category, setCategory] = useState<string | undefined>();
  const [upcoming, setUpcoming] = useState(false);

  const { data, isLoading } = useGetActivities(
    { category, upcoming: upcoming || undefined },
    { query: { queryKey: getGetActivitiesQueryKey({ category, upcoming: upcoming || undefined }) } },
  );

  const activities = (data as any[]) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-community-title">Community Activities</h1>
          <p className="text-muted-foreground">Connect with Chinese and Vietnamese communities in Southeast Asia</p>
        </div>
        <Button size="sm" variant="outline" data-testid="button-post-activity">
          <Plus className="w-4 h-4 mr-1" />Post Activity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex gap-2 flex-wrap flex-1">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => setCategory(undefined)}
            data-testid="tab-category-all"
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => setCategory(cat)}
              data-testid={`tab-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="toggle-upcoming">
          <input
            type="checkbox"
            checked={upcoming}
            onChange={(e) => setUpcoming(e.target.checked)}
            className="rounded"
          />
          Upcoming only
        </label>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No activities found. Be the first to post one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity: any) => (
            <Link key={activity.id} href={`/community/${activity.id}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden" data-testid={`card-activity-${activity.id}`}>
                <div className="flex">
                  {activity.coverImage && (
                    <div className="w-36 bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${activity.coverImage})` }} />
                  )}
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex gap-1 flex-wrap">
                        {activity.category && <Badge variant="secondary" className="text-xs">{activity.category}</Badge>}
                        {activity.isFeatured && <Badge className="text-xs">Featured</Badge>}
                      </div>
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2 mb-3">{activity.title}</h3>
                    <div className="space-y-1.5">
                      {activity.startTime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{new Date(activity.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                      {activity.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{activity.location}</span>
                        </div>
                      )}
                      {activity.maxParticipants && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{activity.currentParticipants} / {activity.maxParticipants} spots</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
