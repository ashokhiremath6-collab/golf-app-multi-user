import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
  isParent: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationAdmin {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
  organizationId: string;
  parTotal: number;
  tees: string;
  rating?: string;
  slope?: string;
}

export default function OrganizationManagement() {
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdminsDialog, setShowAdminsDialog] = useState(false);
  const [showCopyCoursesDialog, setShowCopyCoursesDialog] = useState(false);
  const [newOrgData, setNewOrgData] = useState({ name: "", slug: "" });
  const [editOrgData, setEditOrgData] = useState({ name: "", slug: "" });
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Fetch organizations
  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Fetch courses from parent organization for copying
  const parentOrg = organizations.find(org => org.isParent);
  const { data: parentCourses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: !!parentOrg,
    retry: false,
  });

  // Fetch organization admins when dialog is open
  const { data: orgAdmins = [] } = useQuery<OrganizationAdmin[]>({
    queryKey: ["/api/organizations", selectedOrg?.id, "admins"],
    enabled: showAdminsDialog && !!selectedOrg,
    retry: false,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiRequest("POST", "/api/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowCreateDialog(false);
      setNewOrgData({ name: "", slug: "" });
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: (data: { id: string; name: string; slug: string }) =>
      apiRequest("PUT", `/api/organizations/${data.id}`, { name: data.name, slug: data.slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowEditDialog(false);
      setSelectedOrg(null);
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowDeleteDialog(false);
      setSelectedOrg(null);
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    },
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: (data: { organizationId: string; userId: string }) =>
      apiRequest("POST", `/api/organizations/${data.organizationId}/admins`, { userId: data.userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/organizations", selectedOrg?.id, "admins"] 
      });
      // Also invalidate players cache so Navigation component sees the updated admin status
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${selectedOrg?.id}/players`] 
      });
      setNewAdminEmail("");
      toast({
        title: "Success",
        description: "Admin added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin",
        variant: "destructive",
      });
    },
  });

  // Remove admin mutation
  const removeAdminMutation = useMutation({
    mutationFn: (data: { organizationId: string; userId: string }) =>
      apiRequest("DELETE", `/api/organizations/${data.organizationId}/admins/${data.userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/organizations", selectedOrg?.id, "admins"] 
      });
      // Also invalidate players cache so Navigation component sees the updated admin status
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${selectedOrg?.id}/players`] 
      });
      toast({
        title: "Success",
        description: "Admin removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin",
        variant: "destructive",
      });
    },
  });

  // Copy courses mutation
  const copyCourseMutation = useMutation({
    mutationFn: (data: { organizationId: string; courseId: string }) =>
      apiRequest("POST", `/api/organizations/${data.organizationId}/copy-course`, { courseId: data.courseId }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course copied successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy course",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgData.name.trim() || !newOrgData.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }
    createOrgMutation.mutate(newOrgData);
  };

  const handleUpdateOrg = () => {
    if (!selectedOrg || !editOrgData.name.trim() || !editOrgData.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }
    updateOrgMutation.mutate({
      id: selectedOrg.id,
      name: editOrgData.name,
      slug: editOrgData.slug,
    });
  };

  const handleDeleteOrg = () => {
    if (selectedOrg) {
      deleteOrgMutation.mutate(selectedOrg.id);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedOrg || !newAdminEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Look up user by email to get the actual user ID
      const response = await fetch(`/api/users/lookup?email=${encodeURIComponent(newAdminEmail)}`, {
        credentials: 'include',
      });
      
      if (response.status === 404) {
        const errorData = await response.json();
        toast({
          title: "User Not Found",
          description: errorData.message || `The user ${newAdminEmail} must log in to the application at least once before they can be added as an administrator.`,
          variant: "destructive",
        });
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to lookup user: ${response.status}`);
      }
      
      const userData = await response.json();
      
      addAdminMutation.mutate({
        organizationId: selectedOrg.id,
        userId: userData.id,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add administrator. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = (userId: string) => {
    if (selectedOrg) {
      removeAdminMutation.mutate({
        organizationId: selectedOrg.id,
        userId,
      });
    }
  };

  const handleCopyCourses = () => {
    if (!selectedOrg || selectedCourseIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one course to copy",
        variant: "destructive",
      });
      return;
    }

    // Copy each selected course
    selectedCourseIds.forEach(courseId => {
      copyCourseMutation.mutate({
        organizationId: selectedOrg.id,
        courseId,
      });
    });

    setShowCopyCoursesDialog(false);
    setSelectedCourseIds([]);
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org);
    setEditOrgData({ name: org.name, slug: org.slug });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setSelectedOrg(org);
    setShowDeleteDialog(true);
  };

  const openAdminsDialog = (org: Organization) => {
    setSelectedOrg(org);
    setShowAdminsDialog(true);
  };

  const openCopyCoursesDialog = (org: Organization) => {
    setSelectedOrg(org);
    setShowCopyCoursesDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="text-org-management-title">Organization Management</CardTitle>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-organization"
            >
              <i className="fas fa-plus mr-2"></i>
              Create Organization
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Organizations List */}
      <div className="grid gap-4">
        {organizations.map((org) => (
          <Card key={org.id} data-testid={`card-organization-${org.id}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold" data-testid={`text-org-name-${org.id}`}>
                      {org.name}
                    </h3>
                    {org.isParent && (
                      <Badge variant="secondary" data-testid={`badge-parent-${org.id}`}>
                        Parent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1" data-testid={`text-org-slug-${org.id}`}>
                    Slug: {org.slug}
                  </p>
                  <p className="text-xs text-gray-500" data-testid={`text-org-created-${org.id}`}>
                    Created: {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${org.slug}`, '_blank')}
                    data-testid={`button-visit-${org.id}`}
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Visit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAdminsDialog(org)}
                    data-testid={`button-manage-admins-${org.id}`}
                  >
                    <i className="fas fa-users mr-2"></i>
                    Admins
                  </Button>
                  {!org.isParent && parentCourses.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCopyCoursesDialog(org)}
                      data-testid={`button-copy-courses-${org.id}`}
                    >
                      <i className="fas fa-copy mr-2"></i>
                      Copy Courses
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(org)}
                    data-testid={`button-edit-${org.id}`}
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit
                  </Button>
                  {!org.isParent && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(org)}
                      data-testid={`button-delete-${org.id}`}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-organization">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new golf organization with its own data and administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-org-name">Organization Name</Label>
              <Input
                id="new-org-name"
                value={newOrgData.name}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Sunset Golf Club"
                data-testid="input-new-org-name"
              />
            </div>
            <div>
              <Label htmlFor="new-org-slug">URL Slug</Label>
              <Input
                id="new-org-slug"
                value={newOrgData.slug}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="e.g., sunset-golf-club"
                data-testid="input-new-org-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={createOrgMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-organization">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-org-name">Organization Name</Label>
              <Input
                id="edit-org-name"
                value={editOrgData.name}
                onChange={(e) => setEditOrgData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-edit-org-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-org-slug">URL Slug</Label>
              <Input
                id="edit-org-slug"
                value={editOrgData.slug}
                onChange={(e) => setEditOrgData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                data-testid="input-edit-org-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateOrg}
              disabled={updateOrgMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-organization">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedOrg?.name}"? This will permanently delete
              all associated data including players, courses, rounds, and settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrg}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteOrgMutation.isPending ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Organization Admins Dialog */}
      <Dialog open={showAdminsDialog} onOpenChange={setShowAdminsDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-organization-admins">
          <DialogHeader>
            <DialogTitle>Manage Administrators - {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Add or remove administrators for this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Administrator Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="admin-email"
                    placeholder="Enter user email address"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    data-testid="input-admin-email"
                  />
                  <Button
                    onClick={handleAddAdmin}
                    disabled={addAdminMutation.isPending}
                    data-testid="button-add-admin"
                  >
                    {addAdminMutation.isPending ? "Adding..." : "Add Admin"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note: The user must have logged in to the application at least once before being added as an administrator.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {orgAdmins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium" data-testid={`text-admin-email-${admin.id}`}>
                      {admin.userEmail}
                    </p>
                    <p className="text-xs text-gray-500" data-testid={`text-admin-added-${admin.id}`}>
                      Added: {new Date(admin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAdmin(admin.userId)}
                    disabled={removeAdminMutation.isPending}
                    data-testid={`button-remove-admin-${admin.id}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {orgAdmins.length === 0 && (
                <p className="text-gray-500 text-center py-4" data-testid="text-no-admins">
                  No administrators assigned to this organization.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Courses Dialog */}
      <Dialog open={showCopyCoursesDialog} onOpenChange={setShowCopyCoursesDialog}>
        <DialogContent data-testid="dialog-copy-courses">
          <DialogHeader>
            <DialogTitle>Copy Courses to {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Select courses from the parent organization to copy to this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {parentCourses.map((course) => (
              <div key={course.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`course-${course.id}`}
                  checked={selectedCourseIds.includes(course.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCourseIds(prev => [...prev, course.id]);
                    } else {
                      setSelectedCourseIds(prev => prev.filter(id => id !== course.id));
                    }
                  }}
                  data-testid={`checkbox-course-${course.id}`}
                />
                <label htmlFor={`course-${course.id}`} className="text-sm font-medium">
                  {course.name} ({course.tees} tees, Par {course.parTotal})
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCopyCoursesDialog(false)}
              data-testid="button-cancel-copy"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopyCourses}
              disabled={copyCourseMutation.isPending || selectedCourseIds.length === 0}
              data-testid="button-confirm-copy"
            >
              {copyCourseMutation.isPending ? "Copying..." : `Copy ${selectedCourseIds.length} Course(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}