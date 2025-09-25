import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OrganizationProvider, useOrganization } from "@/hooks/useOrganization";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import OrganizationSelector from "@/pages/OrganizationSelector";
import Home from "@/pages/Home";
import NewRound from "@/pages/NewRound";
import Leaderboard from "@/pages/Leaderboard";
import LeaderboardHistory from "@/pages/LeaderboardHistory";
import History from "@/pages/History";
import Handicaps from "@/pages/Handicaps";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/SuperAdmin";
import Navigation from "@/components/Navigation";

function OrganizationApp() {
  const { currentOrganization, error } = useOrganization();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Organization Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return to Organizations
          </button>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return <OrganizationSelector />;
  }

  // Show organization-specific app with navigation
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Switch>
        <Route path="/:orgSlug/rounds/new" component={NewRound} />
        <Route path="/:orgSlug/leaderboard" component={Leaderboard} />
        <Route path="/:orgSlug/leaderboard-history" component={LeaderboardHistory} />
        <Route path="/:orgSlug/history" component={History} />
        <Route path="/:orgSlug/handicaps" component={Handicaps} />
        <Route path="/:orgSlug/players/:id/rounds" component={History} />
        <Route path="/:orgSlug/admin" component={Admin} />
        <Route path="/:orgSlug" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golf-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <OrganizationProvider>
          <Route path="/super-admin" component={SuperAdmin} />
          <Route path="/" component={OrganizationApp} />
          <Route path="/:orgSlug*" component={OrganizationApp} />
        </OrganizationProvider>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
