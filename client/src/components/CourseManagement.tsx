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
  number: number;
  par: number;
  distance: number;
}

export default function CourseManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tees: 'Blue',
    parTotal: 72,
    rating: '',
    slope: '',
  });

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

  const resetForm = () => {
    setFormData({
      name: '',
      tees: 'Blue',
      parTotal: 72,
      rating: '',
      slope: '',
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

    createCourseMutation.mutate(courseData);
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

  return (
    <div className="space-y-6">
      {/* Course Management */}
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

          {/* Courses List */}
          <div className="space-y-4">
            {courses?.map((course: Course) => (
              <div 
                key={course.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                data-testid={`card-course-${course.id}`}
              >
                <div className="flex items-center justify-between">
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
                  </div>
                </div>

                {/* Holes Display */}
                {selectedCourseId === course.id && holes && (
                  <div className="mt-4 border-t border-gray-200 pt-4" data-testid={`holes-display-${course.id}`}>
                    <h5 className="font-medium text-gray-900 mb-3">Course Layout</h5>
                    <div className="grid grid-cols-9 gap-2 text-xs">
                      <div className="font-medium text-gray-600">Hole</div>
                      {holes.slice(0, 9).map((hole: Hole) => (
                        <div key={hole.id} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                          {hole.number}
                        </div>
                      ))}
                      
                      <div className="text-gray-600">Par</div>
                      {holes.slice(0, 9).map((hole: Hole) => (
                        <div key={hole.id} className="text-center" data-testid={`hole-${hole.number}-par`}>
                          {hole.par}
                        </div>
                      ))}
                      
                      <div className="text-gray-600">Yards</div>
                      {holes.slice(0, 9).map((hole: Hole) => (
                        <div key={hole.id} className="text-center text-xs" data-testid={`hole-${hole.number}-distance`}>
                          {hole.distance}
                        </div>
                      ))}
                    </div>

                    {holes.length > 9 && (
                      <div className="grid grid-cols-10 gap-2 text-xs mt-4">
                        <div className="font-medium text-gray-600">Hole</div>
                        {holes.slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                            {hole.number}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Par</div>
                        {holes.slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center" data-testid={`hole-${hole.number}-par`}>
                            {hole.par}
                          </div>
                        ))}
                        
                        <div className="text-gray-600">Yards</div>
                        {holes.slice(9, 18).map((hole: Hole) => (
                          <div key={hole.id} className="text-center text-xs" data-testid={`hole-${hole.number}-distance`}>
                            {hole.distance}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Front 9:</strong> Par {holes.slice(0, 9).reduce((sum, hole) => sum + hole.par, 0)} • 
                      <strong className="ml-2">Back 9:</strong> Par {holes.slice(9, 18).reduce((sum, hole) => sum + hole.par, 0)} • 
                      <strong className="ml-2">Total:</strong> Par {holes.reduce((sum, hole) => sum + hole.par, 0)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {courses?.length === 0 && (
              <div className="text-center py-8" data-testid="empty-state-courses">
                <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No courses found</h4>
                <p className="text-gray-500">Add your first golf course to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
