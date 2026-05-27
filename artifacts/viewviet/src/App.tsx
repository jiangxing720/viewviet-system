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
import { useEffect, Suspense, lazy } from "react";
import { useGetSettings } from "@workspace/api-client-react";

// Pages
const Home = lazy(() => import("@/pages/home"));
const LearnHub = lazy(() => import("@/pages/learn/hub"));
const Pronunciation = lazy(() => import("@/pages/learn/pronunciation"));
const Vocabulary = lazy(() => import("@/pages/learn/vocabulary"));
const SceneSentences = lazy(() => import("@/pages/learn/scenes"));
const ComplexSentences = lazy(() => import("@/pages/learn/complex"));
const TravelGuides = lazy(() => import("@/pages/guides"));
const GuideDetail = lazy(() => import("@/pages/guides/detail"));
const LegalBlog = lazy(() => import("@/pages/legal"));
const ArticleDetail = lazy(() => import("@/pages/legal/detail"));
const Lawyers = lazy(() => import("@/pages/lawyers"));
const LawyerDetail = lazy(() => import("@/pages/lawyers/detail"));
const LegalDocuments = lazy(() => import("@/pages/legal-documents"));
const LegalDocumentDetail = lazy(() => import("@/pages/legal-documents/detail"));
const Community = lazy(() => import("@/pages/community"));
const ActivityDetail = lazy(() => import("@/pages/community/detail"));
const InterpreterPage = lazy(() => import("@/pages/interpreter"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const AdminLoginPage = lazy(() => import("@/pages/admin/login"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminWords = lazy(() => import("@/pages/admin/words"));
const AdminSentences = lazy(() => import("@/pages/admin/sentences"));
const AdminLegal = lazy(() => import("@/pages/admin/legal"));
const AdminLegalDocuments = lazy(() => import("@/pages/admin/legal-documents"));
const AdminGuides = lazy(() => import("@/pages/admin/guides"));
const AdminLawyers = lazy(() => import("@/pages/admin/lawyers"));
const AdminActivities = lazy(() => import("@/pages/admin/activities"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminLanguages = lazy(() => import("@/pages/admin/languages"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ColorSyncer() {
  const { data } = useGetSettings();
  useEffect(() => {
    if (!data) return;
    const map = data as Record<string, string>;
    const root = document.documentElement;
    if (map["theme.primary_hsl"]) root.style.setProperty("--primary", map["theme.primary_hsl"]);
    if (map["theme.accent_hsl"]) root.style.setProperty("--accent", map["theme.accent_hsl"]);
    try {
      localStorage.setItem("theme-colors", JSON.stringify({
        primary: map["theme.primary_hsl"],
        accent: map["theme.accent_hsl"]
      }));
    } catch (e) {}
  }, [data]);
  return null;
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<div className="flex h-[50vh] w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
        <Switch>
          <Route path="/" component={Home} />

          {/* Auth */}
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/admin/login" component={AdminLoginPage} />

          {/* Learn */}
          <Route path="/learn" component={LearnHub} />
          <Route path="/learn/:lang/pronunciation" component={Pronunciation} />
          <Route path="/learn/:lang/words" component={Vocabulary} />
          <Route path="/learn/:lang/scenes" component={SceneSentences} />
          <Route path="/learn/:lang/complex" component={ComplexSentences} />

          {/* Guides */}
          <Route path="/guides" component={TravelGuides} />
          <Route path="/guides/:id" component={GuideDetail} />

          {/* Legal */}
          <Route path="/legal" component={LegalBlog} />
          <Route path="/legal/:slug" component={ArticleDetail} />
          <Route path="/legal-documents" component={LegalDocuments} />
          <Route path="/legal-documents/:slug" component={LegalDocumentDetail} />
          <Route path="/lawyers" component={Lawyers} />
          <Route path="/lawyers/:id" component={LawyerDetail} />

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
          <Route path="/admin/users">
            {() => <ProtectedAdminRoute><AdminUsers /></ProtectedAdminRoute>}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ColorSyncer />
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
