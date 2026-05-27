import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getLangFlag, LangConfig, fetchLanguagesApi, DEFAULT_LANGS, LANG_STORAGE_KEY } from "@/lib/lang-utils";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  
  const [languages, setLanguages] = useState<LangConfig[]>(() => {
    try {
      const raw = localStorage.getItem(LANG_STORAGE_KEY);
      if (raw) return JSON.parse(raw).filter((l: LangConfig) => l.enabled);
    } catch {}
    return DEFAULT_LANGS.filter(l => l.enabled);
  });

  useEffect(() => {
    fetchLanguagesApi().then(langs => {
      setLanguages(langs.filter(l => l.enabled));
    });
  }, []);

  const handleSwitch = (code: string) => {
    if (code === currentLang) return;
    const newPath = location.replace(/\/learn\/([^\/]+)/, `/learn/${code}`);
    setLocation(newPath);
  };

  const currentConfig = languages.find(l => l.code === currentLang);

  if (languages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
          <span className="text-base leading-none">{getLangFlag(currentLang)}</span>
          <span className="hidden sm:inline-block ml-1">{currentConfig?.label || currentLang.toUpperCase()}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {languages.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => handleSwitch(l.code)} className={`gap-2 cursor-pointer ${l.code === currentLang ? "bg-muted font-medium" : ""}`}>
            <span className="text-lg leading-none">{getLangFlag(l.code)}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
