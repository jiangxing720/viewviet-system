import { Link, useLocation } from "wouter";
import { useTheme } from "./theme-provider";
import { Moon, Sun, Menu, X, Globe, BookOpen, Compass, Scale, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAdmin = location.startsWith("/admin");

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
          <Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Globe className="h-6 w-6" />
            <span>ViewViet{isAdmin ? " Admin" : ""}</span>
          </Link>

          {/* Desktop Nav */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/learn" className={`hover:text-primary transition-colors ${location.startsWith("/learn") ? "text-primary" : ""}`}>
                Learn
              </Link>
              <Link href="/guides" className={`hover:text-primary transition-colors ${location.startsWith("/guides") ? "text-primary" : ""}`}>
                Guides
              </Link>
              <Link href="/legal" className={`hover:text-primary transition-colors ${location.startsWith("/legal") ? "text-primary" : ""}`}>
                Legal
              </Link>
              <Link href="/lawyers" className={`hover:text-primary transition-colors ${location.startsWith("/lawyers") ? "text-primary" : ""}`}>
                Lawyers
              </Link>
              <Link href="/community" className={`hover:text-primary transition-colors ${location.startsWith("/community") ? "text-primary" : ""}`}>
                Community
              </Link>
            </nav>
          )}

          {isAdmin && (
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/admin/words" className={`hover:text-primary ${location === "/admin/words" ? "text-primary" : ""}`}>Words</Link>
              <Link href="/admin/legal" className={`hover:text-primary ${location === "/admin/legal" ? "text-primary" : ""}`}>Legal</Link>
              <Link href="/admin/guides" className={`hover:text-primary ${location === "/admin/guides" ? "text-primary" : ""}`}>Guides</Link>
              <Link href="/admin/lawyers" className={`hover:text-primary ${location === "/admin/lawyers" ? "text-primary" : ""}`}>Lawyers</Link>
              <Link href="/admin/activities" className={`hover:text-primary ${location === "/admin/activities" ? "text-primary" : ""}`}>Activities</Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-6 mt-8">
                  {!isAdmin ? (
                    <>
                      <MobileNavLink href="/learn" icon={BookOpen} title="Learn Languages" />
                      <MobileNavLink href="/guides" icon={Compass} title="Travel Guides" />
                      <MobileNavLink href="/legal" icon={Scale} title="Legal Insights" />
                      <MobileNavLink href="/lawyers" icon={Shield} title="Find Lawyers" />
                      <MobileNavLink href="/community" icon={Users} title="Community" />
                    </>
                  ) : (
                    <>
                      <MobileNavLink href="/admin/words" icon={BookOpen} title="Manage Words" />
                      <MobileNavLink href="/admin/legal" icon={Scale} title="Manage Legal" />
                      <MobileNavLink href="/admin/guides" icon={Compass} title="Manage Guides" />
                      <MobileNavLink href="/admin/lawyers" icon={Shield} title="Manage Lawyers" />
                      <MobileNavLink href="/admin/activities" icon={Users} title="Manage Activities" />
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {children}
      </main>

      {!isAdmin && (
        <footer className="bg-muted mt-auto py-12">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl">
                <Globe className="h-6 w-6" />
                <span>ViewViet</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your trusted companion for cross-border learning, travel, and professional life in Southeast Asia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/learn/vi/words" className="hover:text-primary">Vietnamese</Link></li>
                <li><Link href="/learn/zh/words" className="hover:text-primary">Chinese</Link></li>
                <li><Link href="/learn/en/words" className="hover:text-primary">English</Link></li>
                <li><Link href="/learn/ko/words" className="hover:text-primary">Korean</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/guides" className="hover:text-primary">Travel Guides</Link></li>
                <li><Link href="/legal" className="hover:text-primary">Legal Resources</Link></li>
                <li><Link href="/lawyers" className="hover:text-primary">Find a Lawyer</Link></li>
                <li><Link href="/community" className="hover:text-primary">Community Events</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Admin</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/admin" className="hover:text-primary">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ViewViet. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}

function MobileNavLink({ href, icon: Icon, title }: { href: string, icon: any, title: string }) {
  const [location] = useLocation();
  const isActive = location.startsWith(href);
  
  return (
    <Link href={href} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}>
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
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
