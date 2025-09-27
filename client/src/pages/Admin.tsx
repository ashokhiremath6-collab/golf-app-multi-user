import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Users, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Crown,
  Calculator,
  Calendar
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  email: string | null;
  handicap: number | null;
  isAdmin: boolean;
}

interface Course {
  id: string;
  name: string;
  tees: string;
  parTotal: number;
  rating: number | null;
  slope: number | null;
}

interface OrganizationSettings {
  id: string;
  organizationId: string;
  groupName: string;
  seasonEnd: string;
  leaderboardMetric: string;
  kFactor: number;
  changeCap: number;
}

export default function Admin() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('players');
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form states
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTees, setNewCourseTees] = useState('');
  const [newCourseParTotal, setNewCourseParTotal] = useState(72);
  const [newCourseRating, setNewCourseRating] = useState('');
  const [newCourseSlope, setNewCourseSlope] = useState('');

  // Organization-scoped queries
  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`],
    enabled: !!currentOrganization?.id,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<OrganizationSettings>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/settings`],
    enabled: !!currentOrganization?.id,
  });

  const { data: rounds } = useQuery({
    queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`],
    enabled: !!currentOrganization?.id,
  });

  // Mutations
  const addPlayerMutation = useMutation({
    mutationFn: async (playerData: { name: string; email: string }) => {
      await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/players`, playerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`] });
      toast({ title: "Player Added", description: "New player has been added to the organization." });
      setNewPlayerName('');
      setNewPlayerEmail('');
      setIsAddPlayerOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add player.", variant: "destructive" });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/courses`, courseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/courses`] });
      toast({ title: "Course Added", description: "New course has been added to the organization." });
      setNewCourseName('');
      setNewCourseTees('');
      setNewCourseParTotal(72);
      setNewCourseRating('');
      setNewCourseSlope('');
      setIsAddCourseOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add course.", variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ playerId, isAdmin }: { playerId: string; isAdmin: boolean }) => {
      await apiRequest("PATCH", `/api/organizations/${currentOrganization?.id}/players/${playerId}`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`] });
      toast({ title: "Admin Status Updated", description: "Player admin status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update admin status.", variant: "destructive" });
    },
  });

  const recalculateHandicapsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/handicaps/recalculate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps`] });
      toast({ title: "Handicaps Recalculated", description: "All handicaps have been recalculated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to recalculate handicaps.", variant: "destructive" });
    },
  });

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({ title: "Error", description: "Player name is required.", variant: "destructive" });
      return;
    }
    addPlayerMutation.mutate({ name: newPlayerName.trim(), email: newPlayerEmail.trim() || null });
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim() || !newCourseTees.trim()) {
      toast({ title: "Error", description: "Course name and tees are required.", variant: "destructive" });
      return;
    }
    
    const courseData = {
      name: newCourseName.trim(),
      tees: newCourseTees.trim(),
      parTotal: newCourseParTotal,
      rating: newCourseRating ? parseFloat(newCourseRating) : null,
      slope: newCourseSlope ? parseInt(newCourseSlope) : null,
    };
    
    addCourseMutation.mutate(courseData);
  };

  const handleToggleAdmin = (playerId: string, currentIsAdmin: boolean) => {
    toggleAdminMutation.mutate({ playerId, isAdmin: !currentIsAdmin });
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
              <p className="text-gray-600">Please select an organization to access admin functions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminPlayers = players?.filter(player => player.isAdmin) || [];
  const totalRounds = rounds?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-admin-title">
            {currentOrganization.name} Administration
          </h1>
          <p className="text-gray-600 mt-2" data-testid="text-admin-description">
            Manage players, courses, and organization settings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-total-players">
                {players?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Total Players</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-courses">
                {courses?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Courses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600" data-testid="text-total-rounds">
                {totalRounds}
              </div>
              <div className="text-sm text-gray-600">Rounds Played</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-admins">
                {adminPlayers.length}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="players" data-testid="tab-admin-players">Players</TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-admin-courses">Courses</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-admin-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Manage Players
                  </CardTitle>
                  <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-player">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Player
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Player</DialogTitle>
                        <DialogDescription>
                          Add a new player to this organization.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="playerName">Player Name *</Label>
                          <Input
                            id="playerName"
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            placeholder="Enter player name"
                            data-testid="input-player-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="playerEmail">Email</Label>
                          <Input
                            id="playerEmail"
                            type="email"
                            value={newPlayerEmail}
                            onChange={(e) => setNewPlayerEmail(e.target.value)}
                            placeholder="Enter email (optional)"
                            data-testid="input-player-email"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsAddPlayerOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddPlayer}
                            disabled={addPlayerMutation.isPending}
                            data-testid="button-save-player"
                          >
                            {addPlayerMutation.isPending ? "Adding..." : "Add Player"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : players?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No players in this organization yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {players?.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border"
                        data-testid={`player-admin-${player.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {player.isAdmin && <Crown className="h-5 w-5 text-yellow-500" />}
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-admin-player-${player.id}`}>
                              {player.name}
                            </h3>
                            {player.email && (
                              <p className="text-sm text-gray-600" data-testid={`text-admin-email-${player.id}`}>
                                {player.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.handicap && (
                            <Badge variant="outline" data-testid={`badge-admin-handicap-${player.id}`}>
                              HCP: {player.handicap}
                            </Badge>
                          )}
                          <Button
                            variant={player.isAdmin ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleToggleAdmin(player.id, player.isAdmin)}
                            disabled={toggleAdminMutation.isPending}
                            data-testid={`button-toggle-admin-${player.id}`}
                          >
                            {player.isAdmin ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Manage Courses
                  </CardTitle>
                  <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-course">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>
                          Add a new golf course to this organization.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="courseName">Course Name *</Label>
                          <Input
                            id="courseName"
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            placeholder="Enter course name"
                            data-testid="input-course-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courseTees">Tees *</Label>
                          <Input
                            id="courseTees"
                            value={newCourseTees}
                            onChange={(e) => setNewCourseTees(e.target.value)}
                            placeholder="e.g., Blue, White, Red"
                            data-testid="input-course-tees"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courseParTotal">Par Total</Label>
                          <Input
                            id="courseParTotal"
                            type="number"
                            value={newCourseParTotal}
                            onChange={(e) => setNewCourseParTotal(parseInt(e.target.value) || 72)}
                            min="54"
                            max="90"
                            data-testid="input-course-par"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="courseRating">Rating</Label>
                            <Input
                              id="courseRating"
                              type="number"
                              step="0.1"
                              value={newCourseRating}
                              onChange={(e) => setNewCourseRating(e.target.value)}
                              placeholder="72.1"
                              data-testid="input-course-rating"
                            />
                          </div>
                          <div>
                            <Label htmlFor="courseSlope">Slope</Label>
                            <Input
                              id="courseSlope"
                              type="number"
                              value={newCourseSlope}
                              onChange={(e) => setNewCourseSlope(e.target.value)}
                              placeholder="113"
                              data-testid="input-course-slope"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddCourse}
                            disabled={addCourseMutation.isPending}
                            data-testid="button-save-course"
                          >
                            {addCourseMutation.isPending ? "Adding..." : "Add Course"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : courses?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No courses added to this organization yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses?.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 bg-white rounded-lg border"
                        data-testid={`course-admin-${course.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-admin-course-${course.id}`}>
                              {course.name}
                            </h3>
                            <p className="text-sm text-gray-600" data-testid={`text-admin-course-tees-${course.id}`}>
                              {course.tees} Tees - Par {course.parTotal}
                            </p>
                          </div>
                          <div className="text-right">
                            {course.rating && (
                              <p className="text-sm text-gray-600">Rating: {course.rating}</p>
                            )}
                            {course.slope && (
                              <p className="text-sm text-gray-600">Slope: {course.slope}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Organization settings are managed globally. Contact the super admin to modify group settings.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <Button
                    onClick={() => recalculateHandicapsMutation.mutate()}
                    disabled={recalculateHandicapsMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-recalculate-handicaps"
                  >
                    <Calculator className="h-4 w-4" />
                    {recalculateHandicapsMutation.isPending ? "Recalculating..." : "Recalculate All Handicaps"}
                  </Button>
                  <p className="text-sm text-gray-600">
                    This will recalculate handicaps for all players based on their current rounds.
                  </p>
                </div>

                {settings && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Current Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Group Name:</strong> {settings.groupName}</div>
                      <div><strong>Season End:</strong> {settings.seasonEnd}</div>
                      <div><strong>Leaderboard Metric:</strong> {settings.leaderboardMetric}</div>
                      <div><strong>K-Factor:</strong> {settings.kFactor}</div>
                      <div><strong>Change Cap:</strong> {settings.changeCap}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}