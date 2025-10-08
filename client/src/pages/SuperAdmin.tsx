import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import OrganizationManagement from "@/components/OrganizationManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

// User Session Management Component
function UserSessionManagement() {
  const { toast } = useToast();
  const [confirmLogout, setConfirmLogout] = useState<{ email: string; name: string } | null>(null);

  // Fetch active sessions
  const { data: sessions, isLoading, error: sessionsError } = useQuery({
    queryKey: ["/api/users/sessions"],
  });

  // Show error if sessions failed to load
  useEffect(() => {
    if (sessionsError) {
      toast({
        title: "Failed to Load Sessions",
        description: "Could not retrieve active user sessions. Please try again.",
        variant: "destructive",
      });
    }
  }, [sessionsError, toast]);

  // Force logout mutation
  const forceLogoutMutation = useMutation({
    mutationFn: (email: string) => 
      apiRequest("DELETE", `/api/users/${encodeURIComponent(email)}/sessions`),
    onSuccess: (data: any, email: string) => {
      toast({
        title: "User Logged Out",
        description: `Successfully logged out ${email}. They will need to log in again.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/sessions"] });
      setConfirmLogout(null);
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to force logout user. Please try again.",
        variant: "destructive",
      });
      setConfirmLogout(null);
    },
  });

  const handleForceLogout = (email: string, name: string) => {
    setConfirmLogout({ email, name });
  };

  const confirmForceLogout = () => {
    if (confirmLogout) {
      forceLogoutMutation.mutate(confirmLogout.email);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeSessions = sessions?.filter((s: any) => s.status === 'active') || [];
  const uniqueUsers = Array.from(
    new Map(
      activeSessions
        .filter((s: any) => s.email)
        .map((s: any) => [s.email, s])
    ).values()
  );

  return (
    <Card data-testid="card-user-sessions">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            <i className="fas fa-users-cog mr-2"></i>
            Active User Sessions
          </span>
          <Badge variant="outline" data-testid="badge-session-count">
            {uniqueUsers.length} {uniqueUsers.length === 1 ? 'User' : 'Users'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500" data-testid="text-no-sessions">
            <i className="fas fa-user-slash text-4xl mb-4"></i>
            <p>No active user sessions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueUsers.map((session: any, index: number) => (
              <div
                key={session.email}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`session-user-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fas fa-user-circle text-gray-600"></i>
                    <span className="font-semibold text-gray-900" data-testid={`text-user-name-${index}`}>
                      {session.firstName} {session.lastName}
                    </span>
                    <Badge variant="secondary" data-testid={`badge-user-status-${index}`}>
                      {session.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 ml-6" data-testid={`text-user-email-${index}`}>
                    {session.email}
                  </div>
                  <div className="text-xs text-gray-500 ml-6 mt-1" data-testid={`text-session-expires-${index}`}>
                    Session expires {formatDistanceToNow(new Date(session.expire), { addSuffix: true })}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleForceLogout(session.email, `${session.firstName} ${session.lastName}`)}
                  disabled={forceLogoutMutation.isPending}
                  data-testid={`button-force-logout-${index}`}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Force Logout
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmLogout} onOpenChange={() => setConfirmLogout(null)}>
          <AlertDialogContent data-testid="dialog-confirm-logout">
            <AlertDialogHeader>
              <AlertDialogTitle>
                <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                Confirm Force Logout
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to force logout <strong>{confirmLogout?.name}</strong> ({confirmLogout?.email})?
                <br /><br />
                This will immediately end their session and they will need to log in again. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-logout">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmForceLogout}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-logout"
              >
                {forceLogoutMutation.isPending ? "Logging out..." : "Yes, Force Logout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const { isSuperAdmin, isAuthenticated, isLoading } = useCurrentPlayer();

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/handicaps/test-email"),
    onSuccess: (data: any) => {
      toast({
        title: "Test Email Sent!",
        description: `Successfully sent test email to ${data.sentTo}. Check your inbox!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  // Check if current user is super admin
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <i className="fas fa-shield-alt text-4xl text-red-500 mb-4" data-testid="icon-super-admin-denied"></i>
              <h2 className="text-xl font-semibold text-gray-900 mb-2" data-testid="text-super-admin-denied">
                Super Admin Access Required
              </h2>
              <p className="text-gray-600" data-testid="text-super-admin-required">
                Super admin privileges required to access organization management.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Super Admin Dashboard Header */}
        <Card className="mb-6" data-testid="card-super-admin-header">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-super-admin-title">
                Super Admin Dashboard
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testEmailMutation.isPending}
                  data-testid="button-test-email"
                >
                  <i className="fas fa-envelope mr-2"></i>
                  {testEmailMutation.isPending ? "Sending..." : "Test Email"}
                </Button>
                <Badge variant="destructive" data-testid="badge-super-admin-access">
                  <i className="fas fa-shield-alt mr-2"></i>
                  Super Admin
                </Badge>
              </div>
            </div>
            <p className="text-gray-600" data-testid="text-super-admin-description">
              Manage organizations, administrators, and system-wide operations for the multi-tenant golf platform.
            </p>
          </CardContent>
        </Card>

        {/* Super Admin Tabs */}
        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="organizations" data-testid="tab-organizations">
              <i className="fas fa-building mr-2"></i>Organizations
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <i className="fas fa-users-cog mr-2"></i>User Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <OrganizationManagement />
          </TabsContent>

          <TabsContent value="sessions">
            <UserSessionManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}