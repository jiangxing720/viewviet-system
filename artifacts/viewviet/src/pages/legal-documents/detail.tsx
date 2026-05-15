import { useParams, Link } from "wouter";
import { useGetLegalDocument } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Globe, Calendar, ArrowLeft, Building } from "lucide-react";
import { Seo } from "@/components/seo";
import { useState } from "react";
import { parseMarkdown } from "@/lib/markdown";

export default function LegalDocumentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [lang, setLang] = useState<"zh" | "en" | "local">("zh");

  const { data: doc, isLoading } = useGetLegalDocument(slug ?? "");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-3" />
        <Skeleton className="h-5 w-1/2 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center py-16">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-muted-foreground">条文不存在</p>
        <Link href="/legal-documents">
          <Button className="mt-4" variant="outline">返回条文库</Button>
        </Link>
      </div>
    );
  }

  const d = doc as any;

  const contentMap: Record<string, string | undefined> = {
    zh: d.contentZh,
    en: d.contentEn,
    local: d.contentLocal,
  };
  const content = contentMap[lang];
  const langLabels = { zh: "中文", en: "English", local: "当地语言" };
  const availableLangs = (["zh", "en", "local"] as const).filter((l) => contentMap[l]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Seo
        title={d.titleZh}
        description={d.titleEn ?? d.titleZh}
        path={`/legal-documents/${slug}`}
        type="article"
      />

      <Link href="/legal-documents">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />返回条文库
        </Button>
      </Link>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {d.country && (
          <Badge variant="outline" className="text-xs">
            <Globe className="w-2.5 h-2.5 mr-1" />{d.country}
          </Badge>
        )}
        {d.documentType && <Badge variant="secondary" className="text-xs">{d.documentType}</Badge>}
        {d.category && <Badge variant="secondary" className="text-xs">{d.category}</Badge>}
        {d.isFeatured && <Badge className="text-xs bg-amber-500 hover:bg-amber-500">推荐</Badge>}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-2">{d.titleZh}</h1>
      {d.titleEn && <p className="text-muted-foreground mb-1">{d.titleEn}</p>}
      {d.titleLocal && <p className="text-muted-foreground mb-4">{d.titleLocal}</p>}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
        {d.documentNumber && (
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{d.documentNumber}</span>
        )}
        {d.issuingBody && (
          <span className="flex items-center gap-1">
            <Building className="w-3.5 h-3.5" />{d.issuingBody}
          </span>
        )}
        {d.issueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            颁布: {new Date(d.issueDate).toLocaleDateString("zh-CN")}
          </span>
        )}
        {d.effectiveDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            生效: {new Date(d.effectiveDate).toLocaleDateString("zh-CN")}
          </span>
        )}
      </div>

      {availableLangs.length > 1 && (
        <div className="flex gap-1 mb-4">
          {availableLangs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {langLabels[l]}
            </button>
          ))}
        </div>
      )}

      {content ? (
        (() => {
          const html = parseMarkdown(content);
          return html ? (
            <div
              className="prose prose-neutral max-w-none dark:prose-invert text-foreground"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          );
        })()
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无全文内容</p>
        </div>
      )}

      {d.tags?.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground mb-2">标签</p>
          <div className="flex flex-wrap gap-1.5">
            {(d.tags as string[]).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
