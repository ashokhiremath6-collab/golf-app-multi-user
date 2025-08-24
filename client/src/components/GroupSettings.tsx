import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GroupSettings() {
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/group/settings"],
    retry: false,
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { groupName: string }) => {
      await apiRequest("PUT", "/api/group/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group/settings"] });
      toast({
        title: "Success",
        description: "Group settings updated successfully!",
      });
      setGroupName(""); // Reset form
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update group settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }
    updateGroupMutation.mutate({ groupName: groupName.trim() });
  };

  if (isLoading) {
    return (
      <Card data-testid="card-group-settings">
        <CardHeader>
          <CardTitle>Group Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-group-settings">
      <CardHeader>
        <CardTitle>Group Settings</CardTitle>
        <p className="text-sm text-gray-600">
          Customize your golf group name and branding for the application.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Settings Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Current Settings</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Group Name: </span>
              <span className="font-medium" data-testid="text-current-group-name">
                {settings?.groupName || 'Blues Golf Challenge'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Season End: </span>
              <span className="font-medium">
                {settings?.seasonEnd || 'March 31, 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Update Group Name Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="groupName" className="text-sm font-medium text-gray-700">
              New Group Name
            </Label>
            <Input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter new group name (e.g., Pine Valley Golf Club)"
              className="mt-1"
              data-testid="input-group-name"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will appear in the navigation, landing page, and throughout the application.
            </p>
          </div>

          <Button
            type="submit"
            disabled={updateGroupMutation.isPending || !groupName.trim()}
            className="bg-golf-green hover:bg-green-700"
            data-testid="button-update-group"
          >
            {updateGroupMutation.isPending ? "Updating..." : "Update Group Name"}
          </Button>
        </form>

        {/* Usage Instructions */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-900 mb-2">Usage Instructions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• The group name will replace "Blues Golf Challenge" throughout the application</p>
            <p>• This allows multiple golf groups to use the same application with their own branding</p>
            <p>• Changes take effect immediately for all users</p>
            <p>• Choose a clear, recognizable name for your golf group or club</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}