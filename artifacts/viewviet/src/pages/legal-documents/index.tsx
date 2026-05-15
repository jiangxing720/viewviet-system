import { useState } from "react";
import { Link } from "wouter";
import { useGetLegalDocuments, getGetLegalDocumentsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, Globe, Calendar } from "lucide-react";
import { Seo } from "@/components/seo";

const ASEAN_COUNTRIES = [
  "越南", "泰国", "缅甸", "柬埔寨", "老挝",
  "马来西亚", "新加坡", "印度尼西亚", "菲律宾", "文莱",
];
const DOCUMENT_TYPES = ["宪法", "法律", "法令", "条例", "决议", "通知", "协定", "议定书"];
const CATEGORIES = ["劳动法", "税法", "公司法", "外商投资", "移民", "房产", "知识产权", "海关", "刑法", "民法"];

export default function LegalDocuments() {
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [docType, setDocType] = useState("");

  const { data: resp, isLoading } = useGetLegalDocuments(
    {
      country: country || undefined,
      search: search || undefined,
      category: category || undefined,
      documentType: docType || undefined,
      limit: 50,
    } as any,
    { query: { queryKey: getGetLegalDocumentsQueryKey({ country: country || undefined, search: search || undefined, category: category || undefined, documentType: docType || undefined, limit: 50 } as any) } },
  );

  const docs = (resp as any)?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Seo
        title="法律条文库"
        description="东盟国家法律条文库——越南、泰国、马来西亚等国劳动法、公司法、外商投资法规原文及中文版本。"
        path="/legal-documents"
      />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">法律条文库</h1>
        <p className="text-muted-foreground">东盟11国法律法规汇编，含劳动法、公司法、外商投资等领域原文</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索条文名称..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">全部国家</option>
          {ASEAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">全部领域</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          <option value="">全部类型</option>
          {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无相关条文</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any) => (
            <Link key={doc.id} href={`/legal-documents/${doc.slug}`}>
              <div className="border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-card">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {doc.country && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="w-2.5 h-2.5 mr-1" />{doc.country}
                    </Badge>
                  )}
                  {doc.documentType && <Badge variant="secondary" className="text-xs">{doc.documentType}</Badge>}
                  {doc.category && <Badge variant="secondary" className="text-xs">{doc.category}</Badge>}
                  {doc.isFeatured && <Badge className="text-xs bg-amber-500 hover:bg-amber-500">推荐</Badge>}
                </div>
                <h3 className="font-semibold text-base">{doc.titleZh}</h3>
                {doc.titleEn && <p className="text-xs text-muted-foreground mt-0.5">{doc.titleEn}</p>}
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                  {doc.documentNumber && <span className="font-mono">{doc.documentNumber}</span>}
                  {doc.issuingBody && <span>{doc.issuingBody}</span>}
                  {doc.issueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      颁布: {new Date(doc.issueDate).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                  {doc.effectiveDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      生效: {new Date(doc.effectiveDate).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
