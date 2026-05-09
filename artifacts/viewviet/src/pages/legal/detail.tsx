import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetLegalArticle, getGetLegalArticleQueryKey,
  useGetRelatedLegalArticles, getGetRelatedLegalArticlesQueryKey,
} from "@workspace/api-client-react";
import { Eye, ArrowLeft, Scale, Globe } from "lucide-react";
import { parseMarkdown } from "@/lib/markdown";

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, isError } = useGetLegalArticle(slug, {
    query: { queryKey: getGetLegalArticleQueryKey(slug), enabled: !!slug },
  });
  const a = article as any;

  const { data: related } = useGetRelatedLegalArticles(a?.id ?? 0, {
    query: { queryKey: getGetRelatedLegalArticlesQueryKey(a?.id ?? 0), enabled: !!a?.id },
  });
  const relatedList = (related as any[]) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-60 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (isError || !a) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <Scale className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">Article not found.</p>
        <Link href="/legal"><Button variant="ghost" className="mt-4">← Back to Legal</Button></Link>
      </div>
    );
  }

  const contentHtml = a.content ? parseMarkdown(a.content) : "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" data-testid="page-article-detail">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/legal" data-testid="link-breadcrumb-legal">
          <span className="hover:text-foreground cursor-pointer">Legal</span>
        </Link>
        {a.category && <>
          <span>/</span>
          <span>{a.category}</span>
        </>}
        <span>/</span>
        <span className="text-foreground truncate max-w-xs">{a.title}</span>
      </div>

      <div className="flex gap-8">
        {/* Main article */}
        <div className="flex-1 min-w-0 space-y-5">
          <Button asChild variant="ghost" size="sm" data-testid="button-back-legal">
            <Link href="/legal"><ArrowLeft className="w-4 h-4 mr-1" />Back to Legal</Link>
          </Button>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {a.category && <Badge>{a.category}</Badge>}
              {a.country && <Badge variant="outline"><Globe className="w-3 h-3 mr-1" />{a.country}</Badge>}
              {a.viewCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                  <Eye className="w-4 h-4" />{a.viewCount.toLocaleString()} views
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-snug" data-testid="text-article-title">{a.title}</h1>
            {a.titleEn && a.titleEn !== a.title && <p className="text-muted-foreground">{a.titleEn}</p>}
            {a.summary && <p className="text-muted-foreground italic border-l-4 border-primary pl-4 text-sm leading-relaxed">{a.summary}</p>}
          </div>

          {a.coverImage && (
            <div className="w-full h-64 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${a.coverImage})` }} data-testid="img-article-cover" />
          )}

          {contentHtml ? (
            <div
              className="prose prose-neutral max-w-none dark:prose-invert text-foreground"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              data-testid="text-article-content"
            />
          ) : a.content ? (
            <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-article-content">
              {a.content}
            </div>
          ) : (
            <p className="text-muted-foreground">Full article content coming soon.</p>
          )}

          {a.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {(a.tags as string[]).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {relatedList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Related Articles</p>
                <div className="space-y-2">
                  {relatedList.map((r: any) => (
                    <Link key={r.id} href={`/legal/${r.slug}`}>
                      <Card className="cursor-pointer hover:shadow-sm transition-all" data-testid={`card-related-${r.id}`}>
                        <CardContent className="p-3">
                          {r.category && <Badge variant="secondary" className="text-xs mb-1">{r.category}</Badge>}
                          <p className="text-xs font-medium leading-snug line-clamp-3">{r.title}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center space-y-3">
                <Scale className="w-8 h-8 text-primary mx-auto" />
                <p className="font-semibold text-sm">Need Legal Help?</p>
                <p className="text-xs text-muted-foreground">Connect with our verified legal professionals</p>
                <Button asChild size="sm" className="w-full" data-testid="button-find-lawyers">
                  <Link href="/lawyers">Find a Lawyer</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
