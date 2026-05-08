import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTravelGuide, getGetTravelGuideQueryKey } from "@workspace/api-client-react";
import { MapPin, Eye, ArrowLeft, DollarSign } from "lucide-react";

export default function GuideDetail() {
  const { id } = useParams<{ id: string }>();
  const guideId = Number(id);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" data-testid="page-guide-detail">
      <Link href="/guides">
        <Button variant="ghost" size="sm" data-testid="button-back-guides"><ArrowLeft className="w-4 h-4 mr-1" />Back to Guides</Button>
      </Link>

      {g.coverImage && (
        <div
          className="w-full h-80 rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${g.coverImage})` }}
          data-testid="img-guide-cover"
        />
      )}

      {/* Info bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {g.category && <Badge>{g.category}</Badge>}
        {g.country && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />{g.city}, {g.country}
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

      <h1 className="text-3xl font-bold leading-snug" data-testid="text-guide-title">{g.title}</h1>
      {g.titleEn && g.titleEn !== g.title && <p className="text-muted-foreground">{g.titleEn}</p>}

      {g.content && (
        <div
          className="prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: g.content }}
          data-testid="text-guide-content"
        />
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

      <div className="border-t pt-6">
        <Link href="/guides">
          <Button variant="outline" data-testid="button-bottom-back">← More Guides</Button>
        </Link>
      </div>
    </div>
  );
}
