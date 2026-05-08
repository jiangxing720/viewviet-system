import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetFeaturedTravelGuides,
  useGetFeaturedLegalArticles,
  useGetFeaturedLawyers,
  useGetActivities,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Scale, Users, BookOpen, Globe, ArrowRight, Calendar } from "lucide-react";

export default function Home() {
  const { data: guides, isLoading: guidesLoading } = useGetFeaturedTravelGuides();
  const { data: articles, isLoading: articlesLoading } = useGetFeaturedLegalArticles();
  const { data: lawyers, isLoading: lawyersLoading } = useGetFeaturedLawyers();
  const { data: activities, isLoading: activitiesLoading } = useGetActivities({ upcoming: true });

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white py-24 px-4">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative container mx-auto max-w-5xl text-center space-y-6">
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30 text-sm px-4 py-1" data-testid="badge-hero">
            中越跨境生活平台
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            Your Cross-Border Life,<br />Simplified
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Learn Vietnamese, explore travel guides, navigate legal matters, and connect with your community — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" data-testid="button-start-learning">
              <Link href="/learn">Start Learning</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10" data-testid="button-explore-guides">
              <Link href="/guides">Explore Guides</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick access modules */}
      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/learn/vi/words", icon: BookOpen, label: "Vietnamese", sub: "Words & Phrases", color: "text-primary" },
            { href: "/guides", icon: MapPin, label: "Travel Guides", sub: "Explore Vietnam", color: "text-amber-500" },
            { href: "/legal", icon: Scale, label: "Legal Hub", sub: "Laws & Rights", color: "text-blue-500" },
            { href: "/community", icon: Users, label: "Community", sub: "Events & Activities", color: "text-green-500" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-center p-6" data-testid={`card-module-${label.toLowerCase().replace(/\s/g, '-')}`}>
                <Icon className={`w-8 h-8 mx-auto mb-3 ${color}`} />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Travel Guides */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" data-testid="text-section-guides">Featured Travel Guides</h2>
          <Button asChild variant="ghost" size="sm" data-testid="link-all-guides">
            <Link href="/guides">View all <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </div>
        {guidesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0,1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : !guides?.length ? (
          <p className="text-muted-foreground text-center py-8">No guides yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(guides as any[]).slice(0, 3).map((guide: any) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <Card className="cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1" data-testid={`card-guide-${guide.id}`}>
                  <div
                    className="h-48 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${guide.coverImage || 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400'})` }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />{guide.city}, {guide.country}
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2">{guide.title}</h3>
                    {guide.category && <Badge variant="secondary" className="mt-2 text-xs">{guide.category}</Badge>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Legal Articles */}
      <section className="bg-muted/40 py-12">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" data-testid="text-section-legal">Legal Resources</h2>
            <Button asChild variant="ghost" size="sm" data-testid="link-all-legal">
              <Link href="/legal">View all <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
          {articlesLoading ? (
            <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : !articles?.length ? (
            <p className="text-muted-foreground text-center py-8">No articles yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(articles as any[]).slice(0, 4).map((article: any) => (
                <Link key={article.id} href={`/legal/${article.slug}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4" data-testid={`card-article-${article.id}`}>
                    <div className="flex gap-3">
                      {article.coverImage && (
                        <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${article.coverImage})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        {article.category && <Badge variant="outline" className="text-xs mb-1">{article.category}</Badge>}
                        <h3 className="font-medium text-sm leading-snug line-clamp-2">{article.title}</h3>
                        {article.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.summary}</p>}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Lawyers */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" data-testid="text-section-lawyers">Featured Lawyers</h2>
          <Button asChild variant="ghost" size="sm" data-testid="link-all-lawyers">
            <Link href="/lawyers">View all <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </div>
        {lawyersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        ) : !lawyers?.length ? (
          <p className="text-muted-foreground text-center py-8">No lawyers listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(lawyers as any[]).slice(0, 3).map((lawyer: any) => (
              <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4" data-testid={`card-lawyer-${lawyer.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {lawyer.photo ? (
                        <img src={lawyer.photo} alt={lawyer.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <Scale className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{lawyer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lawyer.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{lawyer.city}, {lawyer.country}</p>
                    </div>
                  </div>
                  {lawyer.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(lawyer.specialties as string[]).slice(0, 2).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Activities */}
      <section className="bg-muted/40 py-12">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" data-testid="text-section-activities">Upcoming Activities</h2>
            <Button asChild variant="ghost" size="sm" data-testid="link-all-activities">
              <Link href="/community">View all <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
          {activitiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0,1].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          ) : !activities?.length ? (
            <p className="text-muted-foreground text-center py-8">No upcoming activities.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activities as any[]).slice(0, 4).map((activity: any) => (
                <Link key={activity.id} href={`/community/${activity.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4" data-testid={`card-activity-${activity.id}`}>
                    <div className="flex gap-3">
                      {activity.coverImage && (
                        <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${activity.coverImage})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        {activity.category && <Badge variant="secondary" className="text-xs mb-1">{activity.category}</Badge>}
                        <h3 className="font-medium text-sm line-clamp-2">{activity.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {activity.startTime ? new Date(activity.startTime).toLocaleDateString() : "TBD"}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{activity.location}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-4 max-w-6xl">
        <Card className="bg-primary/5 border-primary/20 p-8 text-center">
          <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to simplify your cross-border life?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of Chinese expats and travelers navigating Southeast Asia with ViewViet.</p>
          <Button asChild size="lg" data-testid="button-cta-learn">
            <Link href="/learn">Get Started — It's Free</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
