import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Course {
  id: string;
  name: string;
  tees: string;
  parTotal: number;
  rating: number | null;
  slope: number | null;
}

interface Hole {
  id: string;
  courseId: string;
  number: number;
  par: number;
  distance: number | null;
}

export default function CourseManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingHoles, setEditingHoles] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tees: 'Blue',
    parTotal: 72,
    rating: '',
    slope: '',
  });
  
  const [holeEdits, setHoleEdits] = useState<Record<string, { par: number; distance: number | null }>>({});

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
    retry: false,
  });

  const { data: holes } = useQuery({
    queryKey: ["/api/courses", selectedCourseId, "holes"],
    enabled: !!selectedCourseId,
    retry: false,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      await apiRequest("POST", "/api/courses", courseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Success",
        description: "Course created successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
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
        description: "Failed to create course",
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await apiRequest("PUT", `/api/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Success",
        description: "Course updated successfully",
      });
      setEditingCourse(null);
      resetForm();
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
        description: "Failed to update course",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
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
        description: error.message || "Failed to delete course",
        variant: "destructive",
      });
    },
  });

  const ensureHolesMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("POST", `/api/admin/courses/${courseId}/ensure-holes`);
    },
    onSuccess: (data, courseId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "holes"] });
      toast({
        title: "Success",
        description: "Course holes fixed! The course now has 18 holes.",
      });
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
        description: "Failed to fix course holes. Make sure you have admin permissions.",
        variant: "destructive",
      });
    },
  });

  const updateHoleMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await apiRequest("PUT", `/api/holes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourseId, "holes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Success",
        description: "Hole updated successfully",
      });
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
        description: "Failed to update hole",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      tees: 'Blue',
      parTotal: 72,
      rating: '',
      slope: '',
    });
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      tees: course.tees,
      parTotal: course.parTotal,
      rating: course.rating?.toString() || '',
      slope: course.slope?.toString() || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Course name is required",
        variant: "destructive",
      });
      return;
    }

    const courseData = {
      ...formData,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      slope: formData.slope ? parseFloat(formData.slope) : null,
    };

    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, ...courseData });
    } else {
      createCourseMutation.mutate(courseData);
    }
  };

  const startEditingHoles = (courseId: string) => {
    setEditingHoles(courseId);
    const courseHoles = holes as Hole[] || [];
    const initialEdits: Record<string, { par: number; distance: number | null }> = {};
    courseHoles.forEach((hole: Hole) => {
      initialEdits[hole.id] = { par: hole.par, distance: hole.distance };
    });
    setHoleEdits(initialEdits);
  };

  const updateHoleEdit = (holeId: string, field: 'par' | 'distance', value: string) => {
    setHoleEdits(prev => ({
      ...prev,
      [holeId]: {
        ...prev[holeId],
        [field]: field === 'par' ? parseInt(value) || 3 : (value ? parseInt(value) : null)
      }
    }));
  };

  const saveHoleChanges = () => {
    const courseHoles = holes as Hole[] || [];
    const changes = courseHoles.filter((hole: Hole) => {
      const edit = holeEdits[hole.id];
      return edit && (edit.par !== hole.par || edit.distance !== hole.distance);
    });

    if (changes.length === 0) {
      setEditingHoles(null);
      return;
    }

    // Update each changed hole
    changes.forEach((hole: Hole) => {
      const edit = holeEdits[hole.id];
      updateHoleMutation.mutate({
        id: hole.id,
        par: edit.par,
        distance: edit.distance,
      });
    });

    setEditingHoles(null);
    setHoleEdits({});
  };

  if (isLoading) {
    return (
      <Card data-testid="card-course-management-loading">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const coursesArray = (courses as Course[]) || [];

  return (
    <Card data-testid="card-course-management">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-course-management-title">
            Manage Courses
          </h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-golf-blue hover:bg-blue-700" data-testid="button-add-course">
                <i className="fas fa-plus mr-2"></i>Add Course
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-course">
              <DialogHeader>
                <DialogTitle data-testid="text-add-course-title">Add New Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Course Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Course name"
                    required
                    data-testid="input-course-name"
                  />
                </div>
                <div>
                  <Label htmlFor="tees">Tees</Label>
                  <Input
                    id="tees"
                    value={formData.tees}
                    onChange={(e) => setFormData({ ...formData, tees: e.target.value })}
                    placeholder="Blue"
                    data-testid="input-course-tees"
                  />
                </div>
                <div>
                  <Label htmlFor="parTotal">Par Total</Label>
                  <Input
                    id="parTotal"
                    type="number"
                    min="54"
                    max="90"
                    value={formData.parTotal}
                    onChange={(e) => setFormData({ ...formData, parTotal: parseInt(e.target.value) || 72 })}
                    data-testid="input-course-par"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Input
                      id="rating"
                      type="number"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="72.5"
                      data-testid="input-course-rating"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slope">Slope</Label>
                    <Input
                      id="slope"
                      type="number"
                      min="55"
                      max="155"
                      value={formData.slope}
                      onChange={(e) => setFormData({ ...formData, slope: e.target.value })}
                      placeholder="113"
                      data-testid="input-course-slope"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createCourseMutation.isPending} data-testid="button-save-course">
                    {createCourseMutation.isPending ? "Saving..." : "Save Course"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-course">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Course Dialog */}
        <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
          <DialogContent data-testid="dialog-edit-course">
            <DialogHeader>
              <DialogTitle data-testid="text-edit-course-title">Edit Course</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Course Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Course name"
                  required
                  data-testid="input-edit-course-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-tees">Tees</Label>
                <Input
                  id="edit-tees"
                  value={formData.tees}
                  onChange={(e) => setFormData({ ...formData, tees: e.target.value })}
                  placeholder="Blue"
                  data-testid="input-edit-course-tees"
                />
              </div>
              <div>
                <Label htmlFor="edit-parTotal">Par Total</Label>
                <Input
                  id="edit-parTotal"
                  type="number"
                  min="54"
                  max="90"
                  value={formData.parTotal}
                  onChange={(e) => setFormData({ ...formData, parTotal: parseInt(e.target.value) || 72 })}
                  data-testid="input-edit-course-par"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-rating">Rating</Label>
                  <Input
                    id="edit-rating"
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    placeholder="72.5"
                    data-testid="input-edit-course-rating"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-slope">Slope</Label>
                  <Input
                    id="edit-slope"
                    type="number"
                    min="55"
                    max="155"
                    value={formData.slope}
                    onChange={(e) => setFormData({ ...formData, slope: e.target.value })}
                    placeholder="113"
                    data-testid="input-edit-course-slope"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={updateCourseMutation.isPending} data-testid="button-update-course">
                  {updateCourseMutation.isPending ? "Updating..." : "Update Course"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingCourse(null)} data-testid="button-cancel-edit-course">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Courses List */}
        <div className="space-y-4">
          {coursesArray.map((course: Course) => (
            <div 
              key={course.id} 
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              data-testid={`card-course-${course.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900" data-testid={`text-course-name-${course.id}`}>
                    {course.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span data-testid={`text-course-tees-${course.id}`}>{course.tees} Tees</span>
                    <span data-testid={`text-course-par-${course.id}`}>Par {course.parTotal}</span>
                    {course.rating && (
                      <span data-testid={`text-course-rating-${course.id}`}>Rating: {course.rating}</span>
                    )}
                    {course.slope && (
                      <span data-testid={`text-course-slope-${course.id}`}>Slope: {course.slope}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCourseId(selectedCourseId === course.id ? null : course.id)}
                    data-testid={`button-view-holes-${course.id}`}
                  >
                    <i className="fas fa-eye mr-2"></i>
                    {selectedCourseId === course.id ? 'Hide' : 'View'} Holes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ensureHolesMutation.mutate(course.id)}
                    disabled={ensureHolesMutation.isPending}
                    className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                    data-testid={`button-fix-holes-${course.id}`}
                  >
                    <i className={`fas ${ensureHolesMutation.isPending ? 'fa-spinner fa-spin' : 'fa-tools'} mr-2`}></i>
                    {ensureHolesMutation.isPending ? 'Fixing...' : 'Fix Holes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(course)}
                    className="text-golf-blue hover:text-blue-700"
                    data-testid={`button-edit-course-${course.id}`}
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-course-${course.id}`}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid={`dialog-delete-course-${course.id}`}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Course</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{course.name}"? This action cannot be undone. 
                          The course cannot be deleted if it has existing rounds.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete-course">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCourseMutation.mutate(course.id)}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-confirm-delete-course"
                        >
                          Delete Course
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Holes Display/Edit */}
              {selectedCourseId === course.id && holes && Array.isArray(holes) && (
                <div className="border-t border-gray-200 pt-4" data-testid={`holes-display-${course.id}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">Course Layout</h5>
                    {editingHoles === course.id ? (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={saveHoleChanges}
                          data-testid="button-save-holes"
                        >
                          Save Changes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingHoles(null)}
                          data-testid="button-cancel-holes"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => startEditingHoles(course.id)}
                        data-testid="button-edit-holes"
                      >
                        <i className="fas fa-edit mr-2"></i>Edit Holes
                      </Button>
                    )}
                  </div>

                  <Tabs defaultValue="front9" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="front9">Front 9</TabsTrigger>
                      <TabsTrigger value="back9">Back 9</TabsTrigger>
                    </TabsList>

                    <TabsContent value="front9">
                      <div className="grid grid-cols-10 gap-2 text-xs">
                        <div className="font-medium text-gray-600">Hole</div>
                        {(holes as Hole[]).slice(0, 9).map((hole: Hole) => (
                          <div key={hole.id} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                            {hole.number}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Par</div>
                        {(holes as Hole[]).slice(0, 9).map((hole: Hole) => (
                          <div key={hole.id} className="text-center">
                            {editingHoles === course.id ? (
                              <Input
                                type="number"
                                min="3"
                                max="5"
                                value={holeEdits[hole.id]?.par || hole.par}
                                onChange={(e) => updateHoleEdit(hole.id, 'par', e.target.value)}
                                className="w-12 h-8 text-xs text-center"
                                data-testid={`input-hole-${hole.number}-par`}
                              />
                            ) : (
                              <span data-testid={`hole-${hole.number}-par`}>{hole.par}</span>
                            )}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Yards</div>
                        {(holes as Hole[]).slice(0, 9).map((hole: Hole) => (
                          <div key={hole.id} className="text-center">
                            {editingHoles === course.id ? (
                              <Input
                                type="number"
                                min="50"
                                max="700"
                                value={holeEdits[hole.id]?.distance || hole.distance || ''}
                                onChange={(e) => updateHoleEdit(hole.id, 'distance', e.target.value)}
                                className="w-16 h-8 text-xs text-center"
                                data-testid={`input-hole-${hole.number}-distance`}
                              />
                            ) : (
                              <span className="text-xs" data-testid={`hole-${hole.number}-distance`}>
                                {hole.distance || 'N/A'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="back9">
                      <div className="grid grid-cols-10 gap-2 text-xs">
                        <div className="font-medium text-gray-600">Hole</div>
                        {(holes as Hole[]).slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                            {hole.number}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Par</div>
                        {(holes as Hole[]).slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center">
                            {editingHoles === course.id ? (
                              <Input
                                type="number"
                                min="3"
                                max="5"
                                value={holeEdits[hole.id]?.par || hole.par}
                                onChange={(e) => updateHoleEdit(hole.id, 'par', e.target.value)}
                                className="w-12 h-8 text-xs text-center"
                                data-testid={`input-hole-${hole.number}-par`}
                              />
                            ) : (
                              <span data-testid={`hole-${hole.number}-par`}>{hole.par}</span>
                            )}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Yards</div>
                        {(holes as Hole[]).slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center">
                            {editingHoles === course.id ? (
                              <Input
                                type="number"
                                min="50"
                                max="700"
                                value={holeEdits[hole.id]?.distance || hole.distance || ''}
                                onChange={(e) => updateHoleEdit(hole.id, 'distance', e.target.value)}
                                className="w-16 h-8 text-xs text-center"
                                data-testid={`input-hole-${hole.number}-distance`}
                              />
                            ) : (
                              <span className="text-xs" data-testid={`hole-${hole.number}-distance`}>
                                {hole.distance || 'N/A'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 text-sm text-gray-600">
                    <strong>Front 9:</strong> Par {(holes as Hole[]).slice(0, 9).reduce((sum: number, hole: Hole) => sum + hole.par, 0)} • 
                    <strong className="ml-2">Back 9:</strong> Par {(holes as Hole[]).slice(9, 18).reduce((sum: number, hole: Hole) => sum + hole.par, 0)} • 
                    <strong className="ml-2">Total:</strong> Par {(holes as Hole[]).reduce((sum: number, hole: Hole) => sum + hole.par, 0)}
                  </div>
                </div>
              )}
            </div>
          ))}

          {coursesArray.length === 0 && (
            <div className="text-center py-8" data-testid="empty-state-courses">
              <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No courses found</h4>
              <p className="text-gray-500">Add your first golf course to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}