import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { proxyImage } from "@/lib/image-proxy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetFeaturedTravelGuides,
  useGetFeaturedLegalArticles,
  useGetFeaturedLawyers,
  useGetActivities,
  useGetSettings,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Scale, Users, BookOpen, Globe, ArrowRight, Calendar } from "lucide-react";
import { T } from "@/components/T";
import { Seo } from "@/components/seo";

function useSiteSettings() {
  const { data } = useGetSettings();
  return (data as Record<string, string> | undefined) ?? {};
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { data: guides, isLoading: guidesLoading } = useGetFeaturedTravelGuides();
  const { data: articles, isLoading: articlesLoading } = useGetFeaturedLegalArticles();
  const { data: lawyers, isLoading: lawyersLoading } = useGetFeaturedLawyers();
  const { data: activities, isLoading: activitiesLoading } = useGetActivities({ upcoming: true });
  const s = useSiteSettings();

  const lang = i18n.language?.startsWith("en") ? "en" : i18n.language?.startsWith("vi") ? "vi" : "zh";

  const heroTitle = s[`home.hero_title_${lang}`] || s["home.hero_title_zh"] || t("home.hero_title");
  const heroSubtitle = s[`home.hero_subtitle_${lang}`] || s["home.hero_subtitle_zh"] || t("home.hero_subtitle");
  const heroBadge = s["home.hero_badge"] || "中越跨境生活平台";
  const heroBgImage = s["home.hero_bg_image"] || "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600";
  const ctaPrimaryLabel = s["home.hero_cta_primary_label"] || t("home.hero_cta_learn");
  const ctaPrimaryUrl = s["home.hero_cta_primary_url"] || "/learn";
  const ctaSecondaryLabel = s["home.hero_cta_secondary_label"] || t("home.hero_cta_guides");
  const ctaSecondaryUrl = s["home.hero_cta_secondary_url"] || "/guides";

  const sectionGuides = s["home.section_guides_title"] || t("home.featured_guides");
  const sectionLegal = s["home.section_legal_title"] || t("home.legal_resources");
  const sectionLawyers = s["home.section_lawyers_title"] || t("home.featured_lawyers");
  const sectionActivities = s["home.section_activities_title"] || t("home.upcoming_activities");

  const moduleCards = [
    {
      href: s["home.hero_cta_primary_url"] || "/learn/vi/words",
      icon: BookOpen,
      label: s["home.module_vietnamese_label"] || t("home.module_vietnamese"),
      sub: s["home.module_vietnamese_sub"] || t("home.module_words"),
      color: "text-primary",
    },
    {
      href: "/guides",
      icon: MapPin,
      label: s["home.module_travel_label"] || t("home.module_travel"),
      sub: s["home.module_travel_sub"] || t("home.module_explore"),
      color: "text-amber-500",
    },
    {
      href: "/legal",
      icon: Scale,
      label: s["home.module_legal_label"] || t("home.module_legal"),
      sub: s["home.module_legal_sub"] || t("home.module_laws"),
      color: "text-blue-500",
    },
    {
      href: "/community",
      icon: Users,
      label: s["home.module_community_label"] || t("home.module_community"),
      sub: s["home.module_community_sub"] || t("home.module_events"),
      color: "text-green-500",
    },
  ];

  const ctaTitle = s["home.cta_title"] || t("home.cta_title");
  const ctaSubtitle = s["home.cta_subtitle"] || t("home.cta_subtitle");
  const ctaButtonLabel = s["home.cta_button_label"] || t("home.cta_button");
  const ctaButtonUrl = s["home.cta_button_url"] || "/learn";

  return (
    <div className="flex flex-col gap-12 md:gap-16 pb-16">
      <Seo
        path="/"
        description="越南语学习、东南亚旅行攻略、法律资讯、律师查询、华人社区活动，一站式服务旅居东南亚的华人。"
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white py-20 md:py-24 px-4">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url(${heroBgImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="relative container mx-auto max-w-5xl text-center space-y-6">
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30 text-sm px-4 py-1">
            {heroBadge}
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            {heroTitle}
          </h1>
          <p className="text-base md:text-xl text-white/80 max-w-2xl mx-auto">
            {heroSubtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              <Link href={ctaPrimaryUrl}>{ctaPrimaryLabel}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10">
              <Link href={ctaSecondaryUrl}>{ctaSecondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick access modules */}
      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {moduleCards.map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-center p-4 md:p-6">
                <Icon className={`w-7 h-7 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 ${color}`} />
                <p className="font-semibold text-xs md:text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">{sub}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Travel Guides */}
      <section className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">{sectionGuides}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/guides">{t("home.view_all")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </div>
        {guidesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0,1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : !(guides as any[])?.length ? (
          <p className="text-muted-foreground text-center py-8">{t("home.no_guides")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Array.isArray(guides) ? guides : []).slice(0, 3).map((guide: any) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <Card className="cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div
                    className="h-48 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${proxyImage(guide.coverImage) || 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400'})` }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />{guide.city}, {guide.country}
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2"><T>{guide.title}</T></h3>
                    {guide.category && <Badge variant="secondary" className="mt-2 text-xs"><T>{guide.category}</T></Badge>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Legal Resources */}
      <section className="bg-muted/40 py-12">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold">{sectionLegal}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/legal">{t("home.view_all")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
          {articlesLoading ? (
            <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : !(articles as any[])?.length ? (
            <p className="text-muted-foreground text-center py-8">{t("home.no_articles")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Array.isArray(articles) ? articles : []).slice(0, 4).map((article: any) => (
                <Link key={article.id} href={`/legal/${article.slug}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4">
                    <div className="flex gap-3">
                      {article.coverImage && (
                        <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${proxyImage(article.coverImage)})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        {article.category && <Badge variant="outline" className="text-xs mb-1"><T>{article.category}</T></Badge>}
                        <h3 className="font-medium text-sm leading-snug line-clamp-2"><T>{article.title}</T></h3>
                        {article.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-1"><T>{article.summary}</T></p>}
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
          <h2 className="text-xl md:text-2xl font-bold">{sectionLawyers}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/lawyers">{t("home.view_all")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </div>
        {lawyersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        ) : !(Array.isArray(lawyers) ? lawyers : [])?.length ? (
          <p className="text-muted-foreground text-center py-8">{t("home.no_lawyers")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Array.isArray(lawyers) ? lawyers : []).slice(0, 3).map((lawyer: any) => (
              <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4">
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
                      <p className="text-xs text-muted-foreground truncate"><T>{lawyer.title}</T></p>
                      <p className="text-xs text-muted-foreground truncate">{lawyer.city}, {lawyer.country}</p>
                    </div>
                  </div>
                  {lawyer.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(lawyer.specialties as string[]).slice(0, 2).map((sp: string) => (
                        <Badge key={sp} variant="secondary" className="text-xs">{sp}</Badge>
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
            <h2 className="text-xl md:text-2xl font-bold">{sectionActivities}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/community">{t("home.view_all")} <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
          {activitiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0,1].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          ) : !(Array.isArray(activities) ? activities : [])?.length ? (
            <p className="text-muted-foreground text-center py-8">{t("home.no_activities")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Array.isArray(activities) ? activities : []).slice(0, 4).map((activity: any) => (
                <Link key={activity.id} href={`/community/${activity.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200 p-4">
                    <div className="flex gap-3">
                      {activity.coverImage && (
                        <div className="w-20 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${proxyImage(activity.coverImage)})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        {activity.category && <Badge variant="secondary" className="text-xs mb-1"><T>{activity.category}</T></Badge>}
                        <h3 className="font-medium text-sm line-clamp-2"><T>{activity.title}</T></h3>
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
        <Card className="bg-primary/5 border-primary/20 p-6 md:p-8 text-center">
          <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-bold mb-2">{ctaTitle}</h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">{ctaSubtitle}</p>
          <Button asChild size="lg">
            <Link href={ctaButtonUrl}>{ctaButtonLabel}</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
