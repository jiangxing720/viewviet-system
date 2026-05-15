import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLawyers, getGetLawyersQueryKey } from "@workspace/api-client-react";
import { Search, Scale, Phone, Mail, MessageSquare } from "lucide-react";
import { T } from "@/components/T";
import { Seo } from "@/components/seo";

const COUNTRIES = ["越南", "中国", "东南亚"];
const CITIES = ["河内", "胡志明市", "岘港"];

export default function Lawyers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();

  const { data, isLoading } = useGetLawyers(
    { search: search || undefined, country, city },
    { query: { queryKey: getGetLawyersQueryKey({ search: search || undefined, country, city }) } },
  );

  const lawyers = (data as any[]) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Seo
        title="律师查询"
        description="查找东南亚懂中文的律师——越南、泰国、马来西亚、新加坡等国家，劳动法、公司法、移民、房产领域专业律师。"
        path="/lawyers"
      />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("lawyers.title")}</h1>
        <p className="text-muted-foreground">{t("lawyers.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("lawyers.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={country ?? ""}
          onChange={(e) => setCountry(e.target.value || undefined)}
        >
          <option value="">{t("lawyers.all_countries")}</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={city ?? ""}
          onChange={(e) => setCity(e.target.value || undefined)}
        >
          <option value="">{t("lawyers.all_cities")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : lawyers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("lawyers.no_results")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawyers.map((lawyer: any) => (
            <Card key={lawyer.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {lawyer.photo ? (
                      <img src={lawyer.photo} alt={lawyer.name} className="w-14 h-14 object-cover rounded-full" />
                    ) : (
                      <Scale className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-base">{lawyer.name}</p>
                    {lawyer.nameEn && lawyer.nameEn !== lawyer.name && <p className="text-xs text-muted-foreground">{lawyer.nameEn}</p>}
                    {lawyer.title && <p className="text-sm text-muted-foreground"><T>{lawyer.title}</T></p>}
                    {lawyer.lawFirm && <p className="text-xs text-primary font-medium mt-0.5">{lawyer.lawFirm}</p>}
                  </div>
                  {lawyer.isFeatured && <Badge className="ml-auto flex-shrink-0 text-xs">{t("lawyers.featured")}</Badge>}
                </div>

                {(lawyer.city || lawyer.country) && (
                  <p className="text-sm text-muted-foreground">{[lawyer.city, lawyer.country].filter(Boolean).join(", ")}</p>
                )}

                {lawyer.bio && <p className="text-sm text-muted-foreground line-clamp-3"><T>{lawyer.bio}</T></p>}

                {lawyer.specialties?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("lawyers.specialties")}</p>
                    <div className="flex flex-wrap gap-1">
                      {(lawyer.specialties as string[]).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {lawyer.languages?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(lawyer.languages as string[]).map((l: string) => (
                      <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  {lawyer.email && (
                    <a href={`mailto:${lawyer.email}`}>
                      <Button variant="ghost" size="icon" className="w-8 h-8"><Mail className="w-4 h-4" /></Button>
                    </a>
                  )}
                  {lawyer.phone && (
                    <a href={`tel:${lawyer.phone}`}>
                      <Button variant="ghost" size="icon" className="w-8 h-8"><Phone className="w-4 h-4" /></Button>
                    </a>
                  )}
                  {lawyer.whatsapp && (
                    <a href={`https://wa.me/${lawyer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="w-8 h-8"><MessageSquare className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button asChild size="sm" className="ml-auto">
                    <a href={`mailto:${lawyer.email ?? ""}`}>{t("lawyers.contact")}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
