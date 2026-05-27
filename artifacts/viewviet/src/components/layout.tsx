import { Link, useLocation } from "wouter";
import { useTheme } from "./theme-provider";
import { Moon, Sun, Menu, Globe, BookOpen, Compass, Scale, Users, Shield, LogIn, LogOut, UserCircle, ChevronDown, Languages, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth";

const LANGUAGES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
  { code: "vi", label: "VI" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { user, isAdmin, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAdminRoute = location.startsWith("/admin");
  const isAuthRoute = location === "/login" || location === "/register";

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("vv-lang", code);
  };

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          scrolled
            ? "bg-background/80 backdrop-blur-md shadow-sm border-border"
            : "bg-background/0 border-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={isAdminRoute ? "/admin" : "/"} className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <img src="/logo192.png" alt="ViewViet Logo" className="h-7 w-7 object-cover rounded shadow-sm" />
            <span>ViewViet{isAdminRoute ? " Admin" : ""}</span>
          </Link>

          {/* Desktop Nav */}
          {!isAdminRoute && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/learn" className={`hover:text-primary transition-colors ${location.startsWith("/learn") ? "text-primary" : ""}`}>
                {t("nav.learn")}
              </Link>
              <Link href="/guides" className={`hover:text-primary transition-colors ${location.startsWith("/guides") ? "text-primary" : ""}`}>
                {t("nav.guides")}
              </Link>
              <Link href="/legal" className={`hover:text-primary transition-colors ${location.startsWith("/legal") && !location.startsWith("/legal-documents") ? "text-primary" : ""}`}>
                {t("nav.legal")}
              </Link>
              <Link href="/legal-documents" className={`hover:text-primary transition-colors ${location.startsWith("/legal-documents") ? "text-primary" : ""}`}>
                {t("nav.legalDocs")}
              </Link>
              <Link href="/lawyers" className={`hover:text-primary transition-colors ${location.startsWith("/lawyers") ? "text-primary" : ""}`}>
                {t("nav.lawyers")}
              </Link>
              <Link href="/community" className={`hover:text-primary transition-colors ${location.startsWith("/community") ? "text-primary" : ""}`}>
                {t("nav.community")}
              </Link>
              <Link href="/interpreter" className={`hover:text-primary transition-colors flex items-center gap-1 ${location.startsWith("/interpreter") ? "text-primary" : ""}`}>
                <Languages className="h-3.5 w-3.5" />
                {t("nav.interpreter")}
              </Link>
            </nav>
          )}

          {isAdminRoute && (
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/admin/words" className={`hover:text-primary ${location === "/admin/words" ? "text-primary" : ""}`}>{t("admin.words")}</Link>
              <Link href="/admin/legal" className={`hover:text-primary ${location === "/admin/legal" ? "text-primary" : ""}`}>{t("admin.legal")}</Link>
              <Link href="/admin/legal-documents" className={`hover:text-primary ${location === "/admin/legal-documents" ? "text-primary" : ""}`}>法律条文</Link>
              <Link href="/admin/guides" className={`hover:text-primary ${location === "/admin/guides" ? "text-primary" : ""}`}>{t("admin.guides")}</Link>
              <Link href="/admin/sentences" className={`hover:text-primary ${location === "/admin/sentences" ? "text-primary" : ""}`}>{t("admin.sentences")}</Link>
              <Link href="/admin/lawyers" className={`hover:text-primary ${location === "/admin/lawyers" ? "text-primary" : ""}`}>{t("admin.lawyers")}</Link>
              <Link href="/admin/activities" className={`hover:text-primary ${location === "/admin/activities" ? "text-primary" : ""}`}>{t("admin.activities")}</Link>
              <Link href="/admin/settings" className={`hover:text-primary ${location === "/admin/settings" ? "text-primary" : ""}`}>{t("admin.settings")}</Link>
              <Link href="/admin/users" className={`hover:text-primary ${location === "/admin/users" ? "text-primary" : ""}`}>管理员</Link>
            </nav>
          )}

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-medium px-2">
                  <Globe className="h-3.5 w-3.5" />
                  {LANGUAGES.find(l => l.code === i18n.language)?.label ?? "中文"}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[90px]">
                {LANGUAGES.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => switchLang(lang.code)}
                    className={i18n.language === lang.code ? "text-primary font-semibold" : ""}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* Auth buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs hidden md:flex">
                    <UserCircle className="h-4 w-4" />
                    <span className="max-w-[80px] truncate">{user.displayName ?? user.username}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin">{t("nav.admin")}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-1" />
                    {t("nav.login")}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t("nav.register")}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-4 mt-8">
                  {!isAdminRoute ? (
                    <>
                      <MobileNavLink href="/learn" icon={BookOpen} title={t("nav.learn")} />
                      <MobileNavLink href="/guides" icon={Compass} title={t("nav.guides")} />
                      <MobileNavLink href="/legal" icon={Scale} title={t("nav.legal")} />
                      <MobileNavLink href="/legal-documents" icon={FileText} title={t("nav.legalDocs")} />
                      <MobileNavLink href="/lawyers" icon={Shield} title={t("nav.lawyers")} />
                      <MobileNavLink href="/community" icon={Users} title={t("nav.community")} />
                      <MobileNavLink href="/interpreter" icon={Languages} title={t("nav.interpreter")} />
                    </>
                  ) : (
                    <>
                      <MobileNavLink href="/admin/words" icon={BookOpen} title={t("admin.words")} />
                      <MobileNavLink href="/admin/sentences" icon={BookOpen} title={t("admin.sentences")} />
                      <MobileNavLink href="/admin/legal" icon={Scale} title={t("admin.legal")} />
                      <MobileNavLink href="/admin/legal-documents" icon={FileText} title="法律条文" />
                      <MobileNavLink href="/admin/guides" icon={Compass} title={t("admin.guides")} />
                      <MobileNavLink href="/admin/lawyers" icon={Shield} title={t("admin.lawyers")} />
                      <MobileNavLink href="/admin/activities" icon={Users} title={t("admin.activities")} />
                    </>
                  )}
                  <div className="border-t pt-4 mt-2">
                    {user ? (
                      <button
                        onClick={logout}
                        className="flex items-center gap-3 p-3 rounded-lg w-full text-left text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">{t("nav.logout")}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <MobileNavLink href="/login" icon={LogIn} title={t("nav.login")} />
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {children}
      </main>

      {!isAdminRoute && (
        <footer className="bg-muted mt-auto py-12">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl">
                <img src="/logo192.png" alt="ViewViet Logo" className="h-7 w-7 object-cover rounded shadow-sm" />
                <span>ViewViet</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.learn")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/learn/vi/words" className="hover:text-primary">越南语 / Vietnamese</Link></li>
                <li><Link href="/learn/zh/words" className="hover:text-primary">中文 / Chinese</Link></li>
                <li><Link href="/learn/en/words" className="hover:text-primary">English</Link></li>
                <li><Link href="/learn/ko/words" className="hover:text-primary">韩国语 / Korean</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.explore")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/guides" className="hover:text-primary">{t("nav.guides")}</Link></li>
                <li><Link href="/legal" className="hover:text-primary">{t("nav.legal")}</Link></li>
                <li><Link href="/legal-documents" className="hover:text-primary">{t("nav.legalDocs")}</Link></li>
                <li><Link href="/lawyers" className="hover:text-primary">{t("nav.lawyers")}</Link></li>
                <li><Link href="/community" className="hover:text-primary">{t("nav.community")}</Link></li>
                <li><Link href="/interpreter" className="hover:text-primary">{t("nav.interpreter")}</Link></li>
              </ul>
            </div>
            {isAdmin && (
              <div>
                <h4 className="font-semibold mb-4">{t("footer.admin")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/admin" className="hover:text-primary">{t("admin.dashboard")}</Link></li>
                </ul>
              </div>
            )}
          </div>
          <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ViewViet. {t("footer.rights")}.
          </div>
        </footer>
      )}
    </div>
  );
}

function MobileNavLink({ href, icon: Icon, title }: { href: string; icon: any; title: string }) {
  const [location] = useLocation();
  const isActive = location.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{title}</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title="Toggle theme"
      className="text-[#337b80]"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
