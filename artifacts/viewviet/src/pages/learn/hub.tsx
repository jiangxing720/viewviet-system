import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "vi", flag: "🇻🇳", nameKey: "learn.lang_vi", descKey: "learn.lang_vi_desc" },
  { code: "en", flag: "🇬🇧", nameKey: "learn.lang_en", descKey: "learn.lang_en_desc" },
  { code: "zh", flag: "🇨🇳", nameKey: "learn.lang_zh", descKey: "learn.lang_zh_desc" },
  { code: "ko", flag: "🇰🇷", nameKey: "learn.lang_ko", descKey: "learn.lang_ko_desc" },
];

export default function LearnHub() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">{t("learn.title")}</h1>
        <p className="text-muted-foreground">{t("learn.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {LANGUAGES.map(lang => (
          <Link key={lang.code} href={`/learn/${lang.code}/words`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <span className="text-6xl">{lang.flag}</span>
                <div>
                  <h3 className="font-semibold text-xl">{t(lang.nameKey)}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t(lang.descKey)}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
