import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTravelGuides, getGetTravelGuidesQueryKey, useGetFeaturedTravelGuides, getGetFeaturedTravelGuidesQueryKey } from "@workspace/api-client-react";
import { Search, MapPin, Eye, Compass } from "lucide-react";

const CATEGORIES = ["美食", "文化", "户外", "夜生活", "购物", "咖啡", "住宿"];
const COUNTRIES = ["越南", "中国", "东南亚"];

export default function TravelGuides() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [country, setCountry] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data: featured } = useGetFeaturedTravelGuides({
    query: { queryKey: getGetFeaturedTravelGuidesQueryKey() },
  });
  const { data: guidesResp, isLoading } = useGetTravelGuides(
    { search: search || undefined, category, country, page, limit: 12 },
    { query: { queryKey: getGetTravelGuidesQueryKey({ search: search || undefined, category, country, page, limit: 12 }) } },
  );

  const featuredList = (featured as any[]) ?? [];
  const guides = (guidesResp as any)?.data ?? [];
  const pagination = (guidesResp as any)?.pagination;

  const [featuredIdx, setFeaturedIdx] = useState(0);
  const currentFeatured = featuredList[featuredIdx];

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Featured banner */}
      {featuredList.length > 0 && (
        <div className="relative h-[420px] overflow-hidden bg-muted" data-testid="banner-featured-guide">
          {currentFeatured?.coverImage && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${currentFeatured.coverImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{currentFeatured?.city}, {currentFeatured?.country}</span>
              {currentFeatured?.category && <Badge className="bg-accent/90 text-white border-0 text-xs">{currentFeatured.category}</Badge>}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">{currentFeatured?.title}</h2>
            <Link href={`/guides/${currentFeatured?.id}`}>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-view-featured">Read Guide</Button>
            </Link>
          </div>
          {featuredList.length > 1 && (
            <div className="absolute bottom-6 right-8 flex gap-2">
              {featuredList.map((_: any, i: number) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i === featuredIdx ? "bg-white scale-125" : "bg-white/40"}`}
                  onClick={() => setFeaturedIdx(i)}
                  data-testid={`button-featured-dot-${i}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search guides..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-guides" />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={country ?? ""}
            onChange={(e) => { setCountry(e.target.value || undefined); setPage(1); }}
            data-testid="select-country"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            onClick={() => { setCategory(undefined); setPage(1); }}
            data-testid="tab-category-all"
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => { setCategory(cat); setPage(1); }}
              data-testid={`tab-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No guides found. Try different filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide: any) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <Card className="cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full" data-testid={`card-guide-${guide.id}`}>
                  <div
                    className="h-48 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${guide.coverImage || 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400'})` }}
                  />
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />{guide.city}, {guide.country}
                      {guide.viewCount > 0 && (
                        <span className="ml-auto flex items-center gap-1"><Eye className="w-3 h-3" />{guide.viewCount}</span>
                      )}
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2 mb-2">{guide.title}</h3>
                    <div className="flex flex-wrap gap-1">
                      {guide.category && <Badge variant="secondary" className="text-xs">{guide.category}</Badge>}
                      {guide.budgetRange && <Badge variant="outline" className="text-xs">{guide.budgetRange}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
