import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import OrganizationManagement from "@/components/OrganizationManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperAdmin() {
  const { toast } = useToast();
  const { isSuperAdmin, isAuthenticated, isLoading } = useCurrentPlayer();

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
              <Badge variant="destructive" data-testid="badge-super-admin-access">
                <i className="fas fa-shield-alt mr-2"></i>
                Super Admin
              </Badge>
            </div>
            <p className="text-gray-600" data-testid="text-super-admin-description">
              Manage organizations, administrators, and system-wide operations for the multi-tenant golf platform.
            </p>
          </CardContent>
        </Card>

        {/* Super Admin Tabs */}
        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="organizations" data-testid="tab-organizations">
              <i className="fas fa-building mr-2"></i>Organizations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <OrganizationManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}