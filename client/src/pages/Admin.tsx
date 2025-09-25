import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import PlayerManagement from "@/components/PlayerManagement";
import RoundManagement from "@/components/RoundManagement";
import CourseManagement from "@/components/CourseManagement";
import ImportHistory from "@/components/ImportHistory";
import HandicapManagement from "@/components/HandicapManagement";
import GroupSettings from "@/components/GroupSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const { currentOrganization } = useOrganization();

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

  // Use global courses if no organization is selected, otherwise use organization-scoped
  const { data: courses } = useQuery({
    queryKey: currentOrganization?.id 
      ? [`/api/organizations/${currentOrganization.id}/courses`]
      : ["/api/courses"],
    retry: false,
  });

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

  // Check if current user is admin
  if (!currentPlayer?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <i className="fas fa-lock text-4xl text-red-500 mb-4" data-testid="icon-access-denied"></i>
              <h2 className="text-xl font-semibold text-gray-900 mb-2" data-testid="text-access-denied">
                Access Denied
              </h2>
              <p className="text-gray-600" data-testid="text-admin-required">
                Admin privileges required to access this page.
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
        {/* Admin Dashboard Header */}
        <Card className="mb-6" data-testid="card-admin-header">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-admin-title">
                Admin Dashboard
              </h2>
              <Badge variant="destructive" data-testid="badge-admin-access">
                Admin Access
              </Badge>
            </div>
            <p className="text-gray-600" data-testid="text-admin-description">
              Manage players, courses, and system operations for your golf group.
            </p>
          </CardContent>
        </Card>

        {/* Admin Tabs */}
        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="players" data-testid="tab-players">
              <i className="fas fa-users mr-2"></i>Players
            </TabsTrigger>
            <TabsTrigger value="rounds" data-testid="tab-rounds">
              <i className="fas fa-golf-ball mr-2"></i>Rounds
            </TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-courses">
              <i className="fas fa-flag mr-2"></i>Courses
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <i className="fas fa-file-import mr-2"></i>Import
            </TabsTrigger>
            <TabsTrigger value="handicaps" data-testid="tab-handicaps">
              <i className="fas fa-calculator mr-2"></i>Handicaps
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <i className="fas fa-cog mr-2"></i>Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayerManagement />
          </TabsContent>

          <TabsContent value="rounds">
            <RoundManagement />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManagement />
          </TabsContent>

          <TabsContent value="import">
            <ImportHistory />
          </TabsContent>

          <TabsContent value="handicaps">
            <HandicapManagement />
          </TabsContent>

          <TabsContent value="settings">
            <GroupSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
