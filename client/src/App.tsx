import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
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
  const { currentOrganization, error, isLoading } = useOrganization();
  const [location] = useLocation();

  // Show loading state while organization is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golf-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

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

  // If we're on an org path but organization hasn't loaded yet, show loading
  const hasOrgPath = location.split('/')[1] && !['super-admin', 'api', ''].includes(location.split('/')[1]);
  if (hasOrgPath && !currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golf-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return <OrganizationSelector />;
  }

  // Determine which page to render based on the current location
  const orgSlug = currentOrganization.slug;
  let PageComponent = Home;
  
  if (location === `/${orgSlug}/rounds/new`) {
    PageComponent = NewRound;
  } else if (location === `/${orgSlug}/leaderboard`) {
    PageComponent = Leaderboard;
  } else if (location === `/${orgSlug}/leaderboard-history`) {
    PageComponent = LeaderboardHistory;
  } else if (location === `/${orgSlug}/history`) {
    PageComponent = History;
  } else if (location === `/${orgSlug}/handicaps`) {
    PageComponent = Handicaps;
  } else if (location.startsWith(`/${orgSlug}/players/`) && location.endsWith('/rounds')) {
    PageComponent = History;
  } else if (location === `/${orgSlug}/admin`) {
    PageComponent = Admin;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <PageComponent />
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  // If we have any indication of authentication, show the org app
  // This handles the race condition where auth endpoint fails initially but user is actually authenticated
  const hasAnyAuth = isAuthenticated || !!user;

  // After successful authentication, check if there's a returnTo path
  // MUST be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (hasAnyAuth) {
      const returnTo = localStorage.getItem('returnTo');
      if (returnTo) {
        // Validate returnTo is a safe relative path
        const isValidPath = returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('://');
        localStorage.removeItem('returnTo');
        
        if (isValidPath) {
          setLocation(returnTo);
        }
      }
    }
  }, [hasAnyAuth, setLocation]);

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

  // Check if user is trying to access an org route without authentication
  const isOrgRoute = location !== '/' && location !== '' && !location.startsWith('/api');
  
  if (!hasAnyAuth) {
    // If user is trying to access an org route, save it and redirect to login
    if (isOrgRoute) {
      // Validate location is a relative path
      const isValidPath = location.startsWith('/') && !location.startsWith('//') && !location.includes('://');
      
      if (isValidPath) {
        // Save the intended destination
        localStorage.setItem('returnTo', location);
        // Redirect to login with returnTo parameter
        window.location.href = `/api/login?returnTo=${encodeURIComponent(location)}`;
      } else {
        // Invalid path, just redirect to login
        window.location.href = '/api/login';
      }
      
      // Show loading while redirecting
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golf-green mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      );
    }
    
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Wrap authenticated routes with OrganizationProvider outside of Switch
  // This is critical: Switch only inspects direct child routes!
  return (
    <OrganizationProvider>
      <Switch>
        <Route path="/super-admin" component={SuperAdmin} />
        <Route path="/:orgSlug/rounds/new" component={OrganizationApp} />
        <Route path="/:orgSlug/leaderboard" component={OrganizationApp} />
        <Route path="/:orgSlug/leaderboard-history" component={OrganizationApp} />
        <Route path="/:orgSlug/history" component={OrganizationApp} />
        <Route path="/:orgSlug/handicaps" component={OrganizationApp} />
        <Route path="/:orgSlug/players/:id/rounds" component={OrganizationApp} />
        <Route path="/:orgSlug/admin" component={OrganizationApp} />
        <Route path="/:orgSlug" component={OrganizationApp} />
        <Route path="/" component={OrganizationSelector} />
        <Route component={NotFound} />
      </Switch>
    </OrganizationProvider>
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
