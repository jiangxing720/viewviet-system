import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTravelGuide, getGetTravelGuideQueryKey } from "@workspace/api-client-react";
import { MapPin, Eye, ArrowLeft, DollarSign } from "lucide-react";
import { parseMarkdown } from "@/lib/markdown";
import { proxyImage } from "@/lib/image-proxy";
import { T } from "@/components/T";
import { useTranslation } from "react-i18next";
import { useTranslate } from "@/hooks/use-translate";
import { Seo } from "@/components/seo";
import { ShareCardGenerator } from "@/components/ShareCardGenerator";

function TranslatedContent({ content, lang }: { content: string | undefined | null; lang: "en" | "vi" }) {
  const translated = useTranslate(content);
  if (!content) return null;
  const html = parseMarkdown(translated || content);
  if (html) {
    return (
      <div
        className="prose prose-neutral max-w-none dark:prose-invert text-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
        data-testid="text-guide-content"
      />
    );
  }
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert text-foreground whitespace-pre-wrap" data-testid="text-guide-content">
      {translated || content}
    </div>
  );
}

export default function GuideDetail() {
  const { id } = useParams<{ id: string }>();
  const guideId = Number(id);
  const { i18n } = useTranslation();

  const { data: guide, isLoading, isError } = useGetTravelGuide(guideId, {
    query: { queryKey: getGetTravelGuideQueryKey(guideId), enabled: !!guideId },
  });

  const g = guide as any;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (isError || !g) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p className="text-lg">Guide not found.</p>
        <Link href="/guides"><Button variant="ghost" className="mt-4">← Back to Guides</Button></Link>
      </div>
    );
  }

  const isZh = i18n.language === "zh" || !["en", "vi"].includes(i18n.language);
  const contentHtml = g.content ? parseMarkdown(g.content) : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" data-testid="page-guide-detail">
      <Seo
        title={g?.title}
        description={g?.summary ?? undefined}
        path={`/guides/${id}`}
        type="article"
      />
      <Link href="/guides">
        <Button variant="ghost" size="sm" data-testid="button-back-guides">
          <ArrowLeft className="w-4 h-4 mr-1" />Back to Guides
        </Button>
      </Link>

      {g.coverImage && (
        <div
          className="w-full h-80 rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${proxyImage(g.coverImage)})` }}
          data-testid="img-guide-cover"
        />
      )}

      <div className="flex flex-wrap gap-3 items-center">
        {g.category && <Badge><T>{g.category}</T></Badge>}
        {g.country && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />{g.city}{g.city && g.country ? ", " : ""}{g.country}
          </span>
        )}
        {g.budgetRange && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />{g.budgetRange}
          </span>
        )}
        {g.viewCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
            <Eye className="w-4 h-4" />{g.viewCount.toLocaleString()} views
          </span>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold leading-snug" data-testid="text-guide-title"><T>{g.title}</T></h1>
        {g.titleEn && g.titleEn !== g.title && <p className="text-muted-foreground mt-1">{g.titleEn}</p>}
      </div>

      {g.summary && (
        <p className="text-muted-foreground italic border-l-4 border-primary pl-4 text-sm leading-relaxed">
          <T>{g.summary}</T>
        </p>
      )}

      {isZh ? (
        contentHtml ? (
          <div className="prose prose-neutral max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: contentHtml }} data-testid="text-guide-content" />
        ) : g.content ? (
          <div className="prose prose-neutral max-w-none dark:prose-invert text-foreground whitespace-pre-wrap" data-testid="text-guide-content">{g.content}</div>
        ) : null
      ) : (
        <TranslatedContent content={g.content} lang={i18n.language as "en" | "vi"} />
      )}

      {g.mapEmbed && (
        <div className="space-y-2">
          <h3 className="font-semibold">Map</h3>
          <div
            className="w-full h-64 rounded-xl overflow-hidden"
            dangerouslySetInnerHTML={{ __html: g.mapEmbed }}
          />
        </div>
      )}

      <ShareCardGenerator title={g.title ?? ""} content={g.content ?? ""} />

      <div className="border-t pt-6">
        <Link href="/guides">
          <Button variant="outline" data-testid="button-bottom-back">← More Guides</Button>
        </Link>
      </div>
    </div>
  );
}
