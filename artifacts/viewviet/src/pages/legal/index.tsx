import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetLegalArticles, getGetLegalArticlesQueryKey,
  useGetLegalArticleCategories, getGetLegalArticleCategoriesQueryKey,
  useGetFeaturedLegalArticles, getGetFeaturedLegalArticlesQueryKey,
} from "@workspace/api-client-react";
import { Search, Eye, Scale, Globe } from "lucide-react";

const COUNTRIES = ["越南", "东南亚", "中国"];

export default function LegalBlog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [country, setCountry] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data: categories } = useGetLegalArticleCategories({
    query: { queryKey: getGetLegalArticleCategoriesQueryKey() },
  });
  const { data: featured } = useGetFeaturedLegalArticles({
    query: { queryKey: getGetFeaturedLegalArticlesQueryKey() },
  });
  const { data: articlesResp, isLoading } = useGetLegalArticles(
    { search: search || undefined, category, country, page, limit: 10 },
    { query: { queryKey: getGetLegalArticlesQueryKey({ search: search || undefined, category, country, page, limit: 10 }) } },
  );

  const catList = (categories as any[]) ?? [];
  const featuredList = (featured as any[]) ?? [];
  const articles = (articlesResp as any)?.data ?? [];
  const pagination = (articlesResp as any)?.pagination;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-legal-title">Legal Resources</h1>
        <p className="text-muted-foreground">Expert legal insights for cross-border life in Southeast Asia</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-6">
            {/* Category filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${!category ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                  onClick={() => { setCategory(undefined); setPage(1); }}
                  data-testid="filter-cat-all"
                >
                  <span>All Categories</span>
                </button>
                {catList.map((c: any) => (
                  <button
                    key={c.category}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${category === c.category ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                    onClick={() => { setCategory(c.category); setPage(1); }}
                    data-testid={`filter-cat-${c.category}`}
                  >
                    <span>{c.category}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${category === c.category ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"}`}>{c.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Country filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Country</p>
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!country ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                  onClick={() => { setCountry(undefined); setPage(1); }}
                  data-testid="filter-country-all"
                >
                  All
                </button>
                {COUNTRIES.map((c) => (
                  <button
                    key={c}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${country === c ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                    onClick={() => { setCountry(c); setPage(1); }}
                    data-testid={`filter-country-${c}`}
                  >
                    <Globe className="w-3 h-3" />{c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Featured articles */}
          {featuredList.length > 0 && !search && !category && !country && page === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Featured</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featuredList.slice(0, 2).map((a: any) => (
                  <Link key={a.id} href={`/legal/${a.slug}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden" data-testid={`card-featured-${a.id}`}>
                      {a.coverImage && <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${a.coverImage})` }} />}
                      <CardContent className="p-4">
                        {a.category && <Badge className="mb-2 text-xs">{a.category}</Badge>}
                        <h3 className="font-semibold leading-snug line-clamp-2">{a.title}</h3>
                        {a.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search articles..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-legal" />
          </div>

          {/* Articles list */}
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No articles found. Try different filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((a: any) => (
                <Link key={a.id} href={`/legal/${a.slug}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200" data-testid={`card-article-${a.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {a.coverImage && (
                          <div className="w-24 h-16 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${a.coverImage})` }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {a.category && <Badge variant="outline" className="text-xs">{a.category}</Badge>}
                            {a.country && <Badge variant="secondary" className="text-xs">{a.country}</Badge>}
                            {a.viewCount > 0 && (
                              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                <Eye className="w-3 h-3" />{a.viewCount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1">{a.title}</h3>
                          {a.summary && <p className="text-xs text-muted-foreground line-clamp-2">{a.summary}</p>}
                        </div>
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
    </div>
  );
}
