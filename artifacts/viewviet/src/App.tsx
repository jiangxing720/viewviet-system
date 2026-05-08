import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";

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

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminWords from "@/pages/admin/words";
import AdminLegal from "@/pages/admin/legal";
import AdminGuides from "@/pages/admin/guides";
import AdminLawyers from "@/pages/admin/lawyers";
import AdminActivities from "@/pages/admin/activities";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        
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
        
        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/words" component={AdminWords} />
        <Route path="/admin/legal" component={AdminLegal} />
        <Route path="/admin/guides" component={AdminGuides} />
        <Route path="/admin/lawyers" component={AdminLawyers} />
        <Route path="/admin/activities" component={AdminActivities} />
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
