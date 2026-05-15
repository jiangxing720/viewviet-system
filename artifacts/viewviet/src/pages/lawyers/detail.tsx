import { useParams, Link } from "wouter";
import { useGetLawyer } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Phone, Mail, MessageSquare, MapPin, Briefcase, ArrowLeft } from "lucide-react";
import { Seo } from "@/components/seo";

export default function LawyerDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id ?? "0", 10);

  const { data: lawyer, isLoading } = useGetLawyer(numericId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex gap-6 mb-8">
          <Skeleton className="w-28 h-28 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center py-16">
        <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-muted-foreground">律师信息不存在</p>
        <Link href="/lawyers">
          <Button className="mt-4" variant="outline">返回律师列表</Button>
        </Link>
      </div>
    );
  }

  const l = lawyer as any;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Seo
        title={l.name}
        description={l.bio ?? undefined}
        path={`/lawyers/${id}`}
      />

      <Link href="/lawyers">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />返回律师列表
        </Button>
      </Link>

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-primary/20">
          {l.photo ? (
            <img src={l.photo} alt={l.name} className="w-28 h-28 object-cover rounded-full" />
          ) : (
            <Scale className="w-10 h-10 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{l.name}</h1>
            {l.isFeatured && <Badge className="text-xs">推荐律师</Badge>}
          </div>
          {l.nameEn && l.nameEn !== l.name && <p className="text-sm text-muted-foreground">{l.nameEn}</p>}
          {l.nameVi && <p className="text-sm text-muted-foreground">{l.nameVi}</p>}
          {l.title && <p className="text-sm font-medium mt-1">{l.title}</p>}
          {l.lawFirm && (
            <p className="text-primary font-medium mt-1 flex items-center gap-1.5 text-sm">
              <Briefcase className="w-3.5 h-3.5" />{l.lawFirm}
            </p>
          )}
          {(l.city || l.country) && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />{[l.city, l.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {l.bio && (
            <div>
              <h2 className="text-base font-semibold mb-2 border-b pb-1">中文简介</h2>
              <p className="text-muted-foreground leading-relaxed">{l.bio}</p>
            </div>
          )}
          {l.bioEn && (
            <div>
              <h2 className="text-base font-semibold mb-2 border-b pb-1">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">{l.bioEn}</p>
            </div>
          )}
          {l.specialties?.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2 border-b pb-1">专业领域</h2>
              <div className="flex flex-wrap gap-2">
                {(l.specialties as string[]).map((s: string) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {l.languages?.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2 border-b pb-1">语言能力</h2>
              <div className="flex flex-wrap gap-2">
                {(l.languages as string[]).map((lang: string) => (
                  <Badge key={lang} variant="outline">{lang}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-xl border p-5 space-y-4 sticky top-6">
            <h2 className="text-base font-semibold">联系方式</h2>
            <div className="space-y-3 text-sm">
              {l.email && (
                <a href={`mailto:${l.email}`} className="flex items-center gap-2 hover:text-primary transition-colors break-all">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />{l.email}
                </a>
              )}
              {l.phone && (
                <a href={`tel:${l.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />{l.phone}
                </a>
              )}
              {l.whatsapp && (
                <a
                  href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />WhatsApp
                </a>
              )}
              {l.wechat && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />WeChat: {l.wechat}
                </p>
              )}
            </div>
            {l.email && (
              <Button className="w-full" asChild>
                <a href={`mailto:${l.email}`}>发送咨询邮件</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
