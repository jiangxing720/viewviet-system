import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

const LANGUAGES = [
  { code: "vi", name: "Vietnamese", flag: "🇻🇳", desc: "Learn the local language" },
  { code: "en", name: "English", flag: "🇬🇧", desc: "Global communication" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", desc: "Connect with the expat community" },
  { code: "ko", name: "Korean", flag: "🇰🇷", desc: "For business and culture" },
];

export default function LearnHub() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Language Learning Hub</h1>
        <p className="text-muted-foreground">Select a language to start practicing vocabulary and sentences tailored for real-life situations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {LANGUAGES.map(lang => (
          <Link key={lang.code} href={`/learn/${lang.code}/words`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <span className="text-6xl">{lang.flag}</span>
                <div>
                  <h3 className="font-semibold text-xl">{lang.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{lang.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
