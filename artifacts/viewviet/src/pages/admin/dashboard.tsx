import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BookOpen, Scale, MapPin, Users, Activity, Clock } from "lucide-react";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });
  const d = data as any;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/words"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Words</Badge></Link>
          <Link href="/admin/legal"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Legal</Badge></Link>
          <Link href="/admin/guides"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Guides</Badge></Link>
          <Link href="/admin/lawyers"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Lawyers</Badge></Link>
          <Link href="/admin/activities"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Activities</Badge></Link>
          <Link href="/admin/languages"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Languages</Badge></Link>
          <Link href="/admin/settings"><Badge variant="outline" className="cursor-pointer hover:bg-muted">Settings</Badge></Link>
          <Link href="/admin/users"><Badge variant="outline" className="cursor-pointer hover:bg-muted">管理员</Badge></Link>
        </div>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={BookOpen} label="Words" value={d?.totalWords ?? 0} color="bg-primary" />
          <StatCard icon={Scale} label="Articles" value={d?.totalLegalArticles ?? 0} color="bg-blue-500" />
          <StatCard icon={MapPin} label="Guides" value={d?.totalTravelGuides ?? 0} color="bg-amber-500" />
          <StatCard icon={Users} label="Lawyers" value={d?.totalLawyers ?? 0} color="bg-green-500" />
          <StatCard icon={Activity} label="Activities" value={d?.totalActivities ?? 0} color="bg-purple-500" />
          <StatCard icon={Clock} label="Pending" value={d?.pendingActivities ?? 0} color="bg-orange-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (d?.contentByCategory?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d?.contentByCategory ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent words */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Words</CardTitle>
            <Link href="/admin/words"><Badge variant="secondary" className="cursor-pointer text-xs">Manage</Badge></Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (d?.recentWords?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No words yet</p>
            ) : (
              <div className="space-y-2">
                {(d?.recentWords as any[]).map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-word-${w.id}`}>
                    <div>
                      <span className="font-medium text-sm">{w.word}</span>
                      <span className="text-xs text-muted-foreground ml-2">{w.meaningZh}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">{w.languageCode.toUpperCase()}</Badge>
                      {!w.isPublished && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent legal articles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Legal Articles</CardTitle>
          <Link href="/admin/legal"><Badge variant="secondary" className="cursor-pointer text-xs">Manage</Badge></Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (d?.recentLegalArticles?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No articles yet</p>
          ) : (
            <div className="space-y-2">
              {(d?.recentLegalArticles as any[]).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`row-article-${a.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.category} · {a.country}</p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    {a.isFeatured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                    <Badge variant={a.isPublished ? "default" : "outline"} className="text-xs">{a.isPublished ? "Live" : "Draft"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
