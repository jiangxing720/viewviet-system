import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";
import { AuthProvider } from "@/contexts/auth";
import ProtectedAdminRoute from "@/components/protected-route";
import "@/i18n";
import { useEffect } from "react";
import { initSiteSettings } from "@/pages/admin/settings";

// Pages
import Home from "@/pages/home";
import LearnHub from "@/pages/learn/hub";
import Vocabulary from "@/pages/learn/vocabulary";
import SceneSentences from "@/pages/learn/scenes";
import ComplexSentences from "@/pages/learn/complex";
import TravelGuides from "@/pages/guides";
import GuideDetail from "@/pages/guides/detail";
import LegalBlog from "@/pages/legal";
import ArticleDetail from "@/pages/legal/detail";
import Lawyers from "@/pages/lawyers";
import Community from "@/pages/community";
import ActivityDetail from "@/pages/community/detail";
import InterpreterPage from "@/pages/interpreter";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AdminLoginPage from "@/pages/admin/login";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminWords from "@/pages/admin/words";
import AdminSentences from "@/pages/admin/sentences";
import AdminLegal from "@/pages/admin/legal";
import AdminLegalDocuments from "@/pages/admin/legal-documents";
import AdminGuides from "@/pages/admin/guides";
import AdminLawyers from "@/pages/admin/lawyers";
import AdminActivities from "@/pages/admin/activities";
import AdminSettings from "@/pages/admin/settings";
import AdminLanguages from "@/pages/admin/languages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function SiteSettingsInit() {
  useEffect(() => {
    initSiteSettings();
  }, []);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />

        {/* Auth */}
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/admin/login" component={AdminLoginPage} />

        {/* Learn */}
        <Route path="/learn" component={LearnHub} />
        <Route path="/learn/:lang/words" component={Vocabulary} />
        <Route path="/learn/:lang/scenes" component={SceneSentences} />
        <Route path="/learn/:lang/complex" component={ComplexSentences} />

        {/* Guides */}
        <Route path="/guides" component={TravelGuides} />
        <Route path="/guides/:id" component={GuideDetail} />

        {/* Legal */}
        <Route path="/legal" component={LegalBlog} />
        <Route path="/legal/:slug" component={ArticleDetail} />
        <Route path="/lawyers" component={Lawyers} />

        {/* Community */}
        <Route path="/community" component={Community} />
        <Route path="/community/:id" component={ActivityDetail} />

        {/* Interpreter */}
        <Route path="/interpreter" component={InterpreterPage} />

        {/* Admin — protected */}
        <Route path="/admin">
          {() => <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/words">
          {() => <ProtectedAdminRoute><AdminWords /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/sentences">
          {() => <ProtectedAdminRoute><AdminSentences /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/legal">
          {() => <ProtectedAdminRoute><AdminLegal /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/legal-documents">
          {() => <ProtectedAdminRoute><AdminLegalDocuments /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/guides">
          {() => <ProtectedAdminRoute><AdminGuides /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/lawyers">
          {() => <ProtectedAdminRoute><AdminLawyers /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/activities">
          {() => <ProtectedAdminRoute><AdminActivities /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/settings">
          {() => <ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>}
        </Route>
        <Route path="/admin/languages">
          {() => <ProtectedAdminRoute><AdminLanguages /></ProtectedAdminRoute>}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <SiteSettingsInit />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
