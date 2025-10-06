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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [isEditRoundOpen, setIsEditRoundOpen] = useState(false);
  const [isDeleteRoundOpen, setIsDeleteRoundOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [isEditHandicapOpen, setIsEditHandicapOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editHandicapValue, setEditHandicapValue] = useState('');
  
  // Scorecard dialog states
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [scorecardPlayer, setScorecardPlayer] = useState('');
  const [scorecardCourse, setScorecardCourse] = useState('');
  const [scorecardDate, setScorecardDate] = useState(new Date().toISOString().split('T')[0]);
  const [holeScores, setHoleScores] = useState<number[]>(Array(18).fill(4));

  // Form states
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTees, setNewCourseTees] = useState('');
  const [newCourseParTotal, setNewCourseParTotal] = useState(72);
  const [editRoundScores, setEditRoundScores] = useState<number[]>([]);
  const [editRoundHandicap, setEditRoundHandicap] = useState(0);
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

  const { data: rounds } = useQuery<any[]>({
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

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      await apiRequest("DELETE", `/api/organizations/${currentOrganization?.id}/players/${playerId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`] });
      toast({ title: "Player Deleted", description: "Player and all associated rounds have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete player.", variant: "destructive" });
    },
  });

  const updateHandicapMutation = useMutation({
    mutationFn: async ({ playerId, handicap }: { playerId: string; handicap: number | null }) => {
      await apiRequest("PATCH", `/api/organizations/${currentOrganization?.id}/players/${playerId}`, { handicap });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps`] });
      toast({ title: "Handicap Updated", description: "Player handicap has been updated successfully." });
      setIsEditHandicapOpen(false);
      setSelectedPlayer(null);
      setEditHandicapValue('');
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update handicap.", variant: "destructive" });
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

  const editRoundMutation = useMutation({
    mutationFn: async ({ roundId, rawScores, courseHandicap }: { roundId: string; rawScores: number[]; courseHandicap: number }) => {
      await apiRequest("PUT", `/api/organizations/${currentOrganization?.id}/rounds/${roundId}`, { 
        rawScores, 
        courseHandicap 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      toast({ title: "Round Updated", description: "Round has been successfully updated." });
      setIsEditRoundOpen(false);
      setSelectedRound(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update round.", variant: "destructive" });
    },
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      await apiRequest("DELETE", `/api/organizations/${currentOrganization?.id}/rounds/${roundId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      toast({ title: "Round Deleted", description: "Round has been successfully deleted." });
      setIsDeleteRoundOpen(false);
      setSelectedRound(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete round.", variant: "destructive" });
    },
  });

  const addTestRoundMutation = useMutation({
    mutationFn: async (roundData: { playerId: string; courseId: string; rawScores: number[]; playedOn: string; source?: string }) => {
      await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/rounds`, roundData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      toast({ title: "Test Round Added", description: "A test round has been successfully created." });
      setIsScorecardOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create test round.", variant: "destructive" });
    },
  });

  const handleAddTestRound = () => {
    if (!players || players.length === 0) {
      toast({ title: "Error", description: "No players available. Add a player first.", variant: "destructive" });
      return;
    }
    if (!courses || courses.length === 0) {
      toast({ title: "Error", description: "No courses available. Add a course first.", variant: "destructive" });
      return;
    }

    // Reset form and open scorecard dialog
    setScorecardPlayer('');
    setScorecardCourse('');
    setScorecardDate(new Date().toISOString().split('T')[0]);
    setHoleScores(Array(18).fill(4));
    setIsScorecardOpen(true);
  };

  const handleSubmitScorecard = () => {
    if (!scorecardPlayer) {
      toast({ title: "Error", description: "Please select a player.", variant: "destructive" });
      return;
    }
    if (!scorecardCourse) {
      toast({ title: "Error", description: "Please select a course.", variant: "destructive" });
      return;
    }
    if (!scorecardDate) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }

    // Validate hole scores
    if (holeScores.length !== 18) {
      toast({ title: "Error", description: "All 18 holes must have scores.", variant: "destructive" });
      return;
    }
    const invalidScores = holeScores.some(score => score < 1 || score > 10 || !Number.isInteger(score));
    if (invalidScores) {
      toast({ title: "Error", description: "All scores must be between 1 and 10.", variant: "destructive" });
      return;
    }

    // Backend will automatically calculate slope-adjusted course handicap
    addTestRoundMutation.mutate({
      playerId: scorecardPlayer,
      courseId: scorecardCourse,
      rawScores: holeScores,
      playedOn: scorecardDate,
      source: 'admin',
    });
  };

  const handleScoreChange = (holeIndex: number, value: string) => {
    const score = parseInt(value) || 0;
    if (score >= 1 && score <= 10) {
      const newScores = [...holeScores];
      newScores[holeIndex] = score;
      setHoleScores(newScores);
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({ title: "Error", description: "Player name is required.", variant: "destructive" });
      return;
    }
    addPlayerMutation.mutate({ name: newPlayerName.trim(), email: newPlayerEmail.trim() || "" });
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

  const handleEditRound = (round: any) => {
    setSelectedRound(round);
    setEditRoundScores(round.rawScores || []);
    setEditRoundHandicap(round.courseHandicap || 0);
    setIsEditRoundOpen(true);
  };

  const handleDeleteRound = (round: any) => {
    setSelectedRound(round);
    setIsDeleteRoundOpen(true);
  };

  const handleSaveRoundEdit = () => {
    if (!selectedRound) return;
    
    if (editRoundScores.length !== 18) {
      toast({ title: "Error", description: "Must provide exactly 18 scores.", variant: "destructive" });
      return;
    }
    
    editRoundMutation.mutate({
      roundId: selectedRound.id,
      rawScores: editRoundScores,
      courseHandicap: editRoundHandicap
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedRound) return;
    deleteRoundMutation.mutate(selectedRound.id);
  };

  const handleEditHandicap = (player: Player) => {
    setSelectedPlayer(player);
    setEditHandicapValue(player.handicap?.toString() || '');
    setIsEditHandicapOpen(true);
  };

  const handleSaveHandicap = () => {
    if (!selectedPlayer) return;
    
    const handicapValue = editHandicapValue.trim() === '' ? null : parseFloat(editHandicapValue);
    
    if (handicapValue !== null && (isNaN(handicapValue) || handicapValue < 0 || handicapValue > 54)) {
      toast({ 
        title: "Invalid Handicap", 
        description: "Handicap must be a number between 0 and 54, or leave blank for no handicap.", 
        variant: "destructive" 
      });
      return;
    }
    
    updateHandicapMutation.mutate({ playerId: selectedPlayer.id, handicap: handicapValue });
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-600" data-testid="text-total-players">
                {players?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Total Players</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-600" data-testid="text-total-courses">
                {courses?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Courses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-purple-600" data-testid="text-total-rounds">
                {totalRounds}
              </div>
              <div className="text-xs text-gray-600">Rounds Played</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-orange-600" data-testid="text-total-admins">
                {adminPlayers.length}
              </div>
              <div className="text-xs text-gray-600">Admins</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="players" data-testid="tab-admin-players">Players</TabsTrigger>
            <TabsTrigger value="rounds" data-testid="tab-admin-rounds">Rounds</TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-admin-courses">Courses</TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-admin-import">Import</TabsTrigger>
            <TabsTrigger value="handicaps" data-testid="tab-admin-handicaps">Handicaps</TabsTrigger>
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
                          <Label htmlFor="playerEmail">Email *</Label>
                          <Input
                            id="playerEmail"
                            type="email"
                            value={newPlayerEmail}
                            onChange={(e) => setNewPlayerEmail(e.target.value)}
                            placeholder="Enter email"
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                data-testid={`button-delete-player-${player.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid={`dialog-delete-player-${player.id}`}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Player</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{player.name}</strong>? This action cannot be undone and will permanently remove the player and all their associated rounds from this organization.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-player">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePlayerMutation.mutate(player.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete-player"
                                >
                                  Delete Player
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rounds" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Manage Rounds
                  </CardTitle>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border rounded-md text-sm"
                      defaultValue="all"
                      data-testid="select-player-filter"
                    >
                      <option value="all">All Players</option>
                      {players?.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={handleAddTestRound}
                      disabled={addTestRoundMutation.isPending}
                      data-testid="button-add-test-round"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {addTestRoundMutation.isPending ? "Adding..." : "Add Test Round"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!rounds || rounds.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No rounds recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">PLAYER</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">COURSE</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">DATE</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">GROSS</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">NET</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">OVER PAR</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">STATUS</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rounds?.slice(0, 20).map((round: any) => {
                          const player = players?.find(p => p.id === round.playerId);
                          const course = courses?.find(c => c.id === round.courseId);
                          const overPar = parseFloat(round.overPar || '0');
                          const overParDisplay = overPar === 0 ? 'E' : 
                            overPar > 0 ? `+${overPar.toFixed(0)}` : overPar.toFixed(0);
                          
                          return (
                            <tr key={round.id} className="border-b hover:bg-gray-50" data-testid={`round-row-${round.id}`}>
                              <td className="py-3 px-4">{player?.name || 'Unknown'}</td>
                              <td className="py-3 px-4">{course?.name || 'Unknown Course'}</td>
                              <td className="py-3 px-4">{new Date(round.playedOn).toLocaleDateString()}</td>
                              <td className="text-center py-3 px-4 font-semibold">{round.totalStrokes || round.grossCapped}</td>
                              <td className="text-center py-3 px-4 font-semibold text-blue-600">{round.net}</td>
                              <td className="text-center py-3 px-4 font-semibold text-yellow-600">{overParDisplay}</td>
                              <td className="text-center py-3 px-4">
                                <Badge variant="default" className="bg-blue-500">ok</Badge>
                              </td>
                              <td className="text-center py-3 px-4">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => handleEditRound(round)}
                                    data-testid={`button-edit-round-${round.id}`}
                                  >
                                    EDIT
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteRound(round)}
                                    data-testid={`button-delete-round-${round.id}`}
                                  >
                                    DEL
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Import Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Import functionality allows you to bulk import rounds, players, or course data. This feature is coming soon.
                    </AlertDescription>
                  </Alert>
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Import rounds from CSV or Excel files</p>
                    <Button disabled data-testid="button-import-data">
                      <Plus className="h-4 w-4 mr-2" />
                      Import File (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="handicaps" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Manage Handicaps
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({ 
                        title: "Recalculation Started", 
                        description: "Handicaps are being recalculated for all players." 
                      });
                    }}
                    data-testid="button-recalculate-handicaps"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Recalculate All Handicaps
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : players?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No players with handicaps yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {players?.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border"
                        data-testid={`handicap-admin-${player.id}`}
                      >
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900">{player.name}</h3>
                          <p className="text-xs text-gray-600">{player.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={player.handicap ? "default" : "outline"}
                            className="text-sm px-2 py-0.5"
                            data-testid={`badge-handicap-value-${player.id}`}
                          >
                            HCP: {player.handicap !== null ? player.handicap : 'N/A'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditHandicap(player)}
                            data-testid={`button-edit-handicap-${player.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

        {/* Edit Round Dialog */}
        <Dialog open={isEditRoundOpen} onOpenChange={setIsEditRoundOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Round</DialogTitle>
              <DialogDescription>
                Update the scores for this round. All 18 hole scores are required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRound && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <div><strong>Player:</strong> {players?.find(p => p.id === selectedRound.playerId)?.name}</div>
                  <div><strong>Course:</strong> {courses?.find(c => c.id === selectedRound.courseId)?.name}</div>
                  <div><strong>Date:</strong> {new Date(selectedRound.date).toLocaleDateString()}</div>
                </div>
              )}
              
              <div>
                <Label htmlFor="edit-handicap">Course Handicap</Label>
                <Input
                  id="edit-handicap"
                  type="number"
                  value={editRoundHandicap}
                  onChange={(e) => setEditRoundHandicap(parseInt(e.target.value) || 0)}
                  min="0"
                  max="54"
                  data-testid="input-edit-handicap"
                />
              </div>

              <div>
                <Label>Scores (18 holes)</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i}>
                      <Label htmlFor={`hole-${i}`} className="text-xs">H{i + 1}</Label>
                      <Input
                        id={`hole-${i}`}
                        type="number"
                        value={editRoundScores[i] || ''}
                        onChange={(e) => {
                          const newScores = [...editRoundScores];
                          newScores[i] = parseInt(e.target.value) || 0;
                          setEditRoundScores(newScores);
                        }}
                        min="1"
                        max="10"
                        className="text-center"
                        data-testid={`input-edit-score-${i}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditRoundOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRoundEdit}
                  disabled={editRoundMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editRoundMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Round Dialog */}
        <Dialog open={isDeleteRoundOpen} onOpenChange={setIsDeleteRoundOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Round</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this round? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedRound && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <div><strong>Player:</strong> {players?.find(p => p.id === selectedRound.playerId)?.name}</div>
                <div><strong>Course:</strong> {courses?.find(c => c.id === selectedRound.courseId)?.name}</div>
                <div><strong>Date:</strong> {new Date(selectedRound.date).toLocaleDateString()}</div>
                <div><strong>Score:</strong> {selectedRound.totalStrokes || selectedRound.grossCapped}</div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteRoundOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteRoundMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteRoundMutation.isPending ? "Deleting..." : "Delete Round"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Handicap Dialog */}
        <Dialog open={isEditHandicapOpen} onOpenChange={setIsEditHandicapOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Player Handicap</DialogTitle>
              <DialogDescription>
                Manually set or update the handicap for {selectedPlayer?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-player-handicap">Handicap Index</Label>
                <Input
                  id="edit-player-handicap"
                  type="number"
                  step="0.1"
                  value={editHandicapValue}
                  onChange={(e) => setEditHandicapValue(e.target.value)}
                  placeholder="Enter handicap (0-54) or leave blank"
                  min="0"
                  max="54"
                  data-testid="input-edit-player-handicap"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to remove handicap, or enter a value between 0 and 54
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditHandicapOpen(false);
                    setSelectedPlayer(null);
                    setEditHandicapValue('');
                  }}
                  data-testid="button-cancel-handicap-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveHandicap}
                  disabled={updateHandicapMutation.isPending}
                  data-testid="button-save-handicap"
                >
                  {updateHandicapMutation.isPending ? "Saving..." : "Save Handicap"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scorecard Dialog for Test Round */}
        <Dialog open={isScorecardOpen} onOpenChange={setIsScorecardOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Test Round - Scorecard</DialogTitle>
              <DialogDescription>
                Fill in the scorecard details to create a test round
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Player, Course, and Date Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scorecard-player">Player</Label>
                  <select
                    id="scorecard-player"
                    value={scorecardPlayer}
                    onChange={(e) => setScorecardPlayer(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    data-testid="select-scorecard-player"
                  >
                    <option value="">Select Player</option>
                    {players?.map(player => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="scorecard-course">Course</Label>
                  <select
                    id="scorecard-course"
                    value={scorecardCourse}
                    onChange={(e) => setScorecardCourse(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    data-testid="select-scorecard-course"
                  >
                    <option value="">Select Course</option>
                    {courses?.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="scorecard-date">Date</Label>
                  <Input
                    id="scorecard-date"
                    type="date"
                    value={scorecardDate}
                    onChange={(e) => setScorecardDate(e.target.value)}
                    data-testid="input-scorecard-date"
                  />
                </div>
              </div>

              {/* 18-Hole Scorecard */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Hole Scores (1-10)</Label>
                <div className="grid grid-cols-9 gap-2">
                  {holeScores.map((score, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <Label className="text-xs mb-1">Hole {index + 1}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={score}
                        onChange={(e) => handleScoreChange(index, e.target.value)}
                        className="w-full text-center"
                        data-testid={`input-hole-${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2" data-testid="text-total-strokes">
                  Total Strokes: {holeScores.reduce((a, b) => a + b, 0)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsScorecardOpen(false)}
                  data-testid="button-cancel-scorecard"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitScorecard}
                  disabled={addTestRoundMutation.isPending}
                  data-testid="button-submit-scorecard"
                >
                  {addTestRoundMutation.isPending ? "Creating..." : "Create Round"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}