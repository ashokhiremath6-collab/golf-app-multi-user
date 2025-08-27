import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Round {
  id: string;
  playerId: string;
  courseId: string;
  playedOn: string;
  rawScores: number[];
  grossCapped: number;
  net: number;
  overPar: string;
  courseHandicap: number;
  source: string;
  status: string;
}

interface Player {
  id: string;
  name: string;
  currentHandicap: number;
}

interface Course {
  id: string;
  name: string;
  parTotal: number;
}

export default function RoundManagement() {
  const { toast } = useToast();
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [editScores, setEditScores] = useState<number[]>([]);
  const [editHandicap, setEditHandicap] = useState<number>(0);
  const [showTestRoundForm, setShowTestRoundForm] = useState(false);
  const [testRoundData, setTestRoundData] = useState({
    playerId: '',
    courseId: '',
    playedOn: new Date().toISOString().split('T')[0],
    courseHandicap: 16,
    scores: Array(18).fill(4)
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds"],
    retry: false,
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    retry: false,
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    retry: false,
  });

  const updateRoundMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await apiRequest("PUT", `/api/rounds/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: "Success",
        description: "Round updated successfully",
      });
      setEditingRound(null);
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
        description: "Failed to update round",
        variant: "destructive",
      });
    },
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      await apiRequest("DELETE", `/api/rounds/${roundId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: "Success",
        description: "Round deleted successfully",
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
        description: "Failed to delete round",
        variant: "destructive",
      });
    },
  });

  const createTestRoundMutation = useMutation({
    mutationFn: async (roundData: any) => {
      await apiRequest("POST", "/api/admin/rounds", {
        ...roundData,
        rawScores: roundData.scores,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: "Success",
        description: "Test round created successfully",
      });
      setShowTestRoundForm(false);
      setTestRoundData({
        playerId: '',
        courseId: '',
        playedOn: new Date().toISOString().split('T')[0],
        courseHandicap: 16,
        scores: Array(18).fill(4)
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
        description: "Failed to create test round",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (round: Round) => {
    setEditingRound(round);
    setEditScores([...round.rawScores]);
    setEditHandicap(round.courseHandicap);
  };

  const handleScoreChange = (holeIndex: number, score: string) => {
    const newScores = [...editScores];
    newScores[holeIndex] = parseInt(score) || 0;
    setEditScores(newScores);
  };

  const handleUpdateRound = () => {
    if (!editingRound) return;

    const validScores = editScores.every(score => score > 0 && score <= 10);
    if (!validScores) {
      toast({
        title: "Error",
        description: "Please enter valid scores for all 18 holes (1-10)",
        variant: "destructive",
      });
      return;
    }

    updateRoundMutation.mutate({
      id: editingRound.id,
      rawScores: editScores,
      courseHandicap: editHandicap,
    });
  };

  const handleCreateTestRound = () => {
    if (!testRoundData.playerId || !testRoundData.courseId) {
      toast({
        title: "Error",
        description: "Please select a player and course",
        variant: "destructive",
      });
      return;
    }

    const validScores = testRoundData.scores.every(score => score > 0 && score <= 10);
    if (!validScores) {
      toast({
        title: "Error",
        description: "Please enter valid scores for all 18 holes (1-10)",
        variant: "destructive",
      });
      return;
    }

    createTestRoundMutation.mutate(testRoundData);
  };

  const handleTestScoreChange = (holeIndex: number, score: string) => {
    const newScores = [...testRoundData.scores];
    newScores[holeIndex] = parseInt(score) || 0;
    setTestRoundData({ ...testRoundData, scores: newScores });
  };

  const setRandomScores = () => {
    const randomScores = Array(18).fill(0).map(() => Math.floor(Math.random() * 6) + 3); // Random scores 3-8
    setTestRoundData({ ...testRoundData, scores: randomScores });
  };

  const getPlayerName = (playerId: string) => {
    return playersArray.find((p: Player) => p.id === playerId)?.name || 'Unknown Player';
  };

  const getCourseName = (courseId: string) => {
    return coursesArray.find((c: Course) => c.id === courseId)?.name || 'Unknown Course';
  };

  const roundsArray = Array.isArray(rounds) ? rounds : [];
  const playersArray = Array.isArray(players) ? players : [];
  const coursesArray = Array.isArray(courses) ? courses : [];

  const filteredRounds = roundsArray.filter((round: Round) => 
    selectedPlayer === "all" || round.playerId === selectedPlayer
  );

  if (roundsLoading) {
    return (
      <Card data-testid="card-round-management-loading">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-round-management">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-round-management-title">
            Manage Rounds
          </h3>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setShowTestRoundForm(!showTestRoundForm)}
              className="bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-toggle-test-round"
            >
              {showTestRoundForm ? 'Hide' : 'Add Test Round'}
            </Button>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-48" data-testid="select-player-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {playersArray.map((player: Player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Test Round Form */}
        {showTestRoundForm && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <h4 className="text-md font-medium mb-4 text-yellow-800">Create Test Round</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="test-player">Player</Label>
                  <Select value={testRoundData.playerId} onValueChange={(value) => setTestRoundData({ ...testRoundData, playerId: value })}>
                    <SelectTrigger data-testid="select-test-player">
                      <SelectValue placeholder="Select player">
                        {testRoundData.playerId ? getPlayerName(testRoundData.playerId) : "Select player"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {playersArray.map((player: Player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-course">Course</Label>
                  <Select value={testRoundData.courseId} onValueChange={(value) => setTestRoundData({ ...testRoundData, courseId: value })}>
                    <SelectTrigger data-testid="select-test-course">
                      <SelectValue placeholder="Select course">
                        {testRoundData.courseId ? getCourseName(testRoundData.courseId) : "Select course"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {coursesArray.map((course: Course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-date">Date</Label>
                  <Input
                    id="test-date"
                    type="date"
                    value={testRoundData.playedOn}
                    onChange={(e) => setTestRoundData({ ...testRoundData, playedOn: e.target.value })}
                    data-testid="input-test-date"
                  />
                </div>
                <div>
                  <Label htmlFor="test-handicap">Course Handicap</Label>
                  <Input
                    id="test-handicap"
                    type="number"
                    min="0"
                    max="54"
                    value={testRoundData.courseHandicap}
                    onChange={(e) => setTestRoundData({ ...testRoundData, courseHandicap: parseInt(e.target.value) || 16 })}
                    data-testid="input-test-handicap"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Scores (1-18):</Label>
                  <Button type="button" variant="outline" onClick={setRandomScores} data-testid="button-random-scores">
                    Random Scores
                  </Button>
                </div>
                <div className="grid grid-cols-9 gap-2">
                  {testRoundData.scores.map((score, index) => (
                    <div key={index} className="text-center">
                      <Label className="text-xs text-gray-600 mb-1 block">
                        {index + 1}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={score}
                        onChange={(e) => handleTestScoreChange(index, e.target.value)}
                        className="text-center text-xs"
                        data-testid={`input-test-score-${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 mt-6">
                <Button 
                  onClick={handleCreateTestRound}
                  disabled={createTestRoundMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-create-test-round"
                >
                  {createTestRoundMutation.isPending ? "Creating..." : "Create Test Round"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowTestRoundForm(false)}
                  data-testid="button-cancel-test-round"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Round Dialog */}
        <Dialog open={!!editingRound} onOpenChange={() => setEditingRound(null)}>
          <DialogContent className="max-w-4xl" data-testid="dialog-edit-round">
            <DialogHeader>
              <DialogTitle data-testid="text-edit-round-title">
                Edit Round - {editingRound && getPlayerName(editingRound.playerId)}
              </DialogTitle>
            </DialogHeader>
            {editingRound && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Course:</strong> {getCourseName(editingRound.courseId)}</div>
                    <div><strong>Date:</strong> {new Date(editingRound.playedOn).toLocaleDateString()}</div>
                    <div>
                      <strong>Course Handicap:</strong>
                      <Input
                        type="number"
                        min="0"
                        max="54"
                        value={editHandicap}
                        onChange={(e) => setEditHandicap(parseInt(e.target.value) || 0)}
                        className="mt-1 w-20 text-center inline-block ml-2"
                        data-testid="input-edit-handicap"
                      />
                    </div>
                    <div><strong>Status:</strong> 
                      <Badge className="ml-2" variant={editingRound.status === 'ok' ? 'default' : 'destructive'}>
                        {editingRound.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Edit Scores (1-18):</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {editScores.map((score, index) => (
                      <div key={index} className="text-center">
                        <Label className="text-xs text-gray-600 mb-1 block">
                          Hole {index + 1}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={score}
                          onChange={(e) => handleScoreChange(index, e.target.value)}
                          className="text-center"
                          data-testid={`input-edit-score-${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUpdateRound}
                    disabled={updateRoundMutation.isPending}
                    data-testid="button-save-round-changes"
                  >
                    {updateRoundMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingRound(null)}
                    data-testid="button-cancel-round-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rounds Table */}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-rounds">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Over Par</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRounds?.map((round: Round) => (
                <tr key={round.id} data-testid={`row-round-${round.id}`}>
                  <td className="px-4 py-4 font-medium" data-testid={`text-round-player-${round.id}`}>
                    {getPlayerName(round.playerId)}
                  </td>
                  <td className="px-4 py-4 text-gray-600" data-testid={`text-round-course-${round.id}`}>
                    {getCourseName(round.courseId)}
                  </td>
                  <td className="px-4 py-4 text-gray-600" data-testid={`text-round-date-${round.id}`}>
                    {new Date(round.playedOn).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-center font-medium" data-testid={`text-round-gross-${round.id}`}>
                    {round.rawScores.reduce((sum, score) => sum + score, 0)}
                  </td>
                  <td className="px-4 py-4 text-center text-golf-blue font-medium" data-testid={`text-round-net-${round.id}`}>
                    {round.net}
                  </td>
                  <td className="px-4 py-4 text-center text-golf-gold font-medium" data-testid={`text-round-over-par-${round.id}`}>
                    {parseInt(round.overPar) > 0 ? '+' : ''}{round.overPar}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge 
                      variant={round.status === 'ok' ? 'default' : 'destructive'}
                      data-testid={`badge-round-status-${round.id}`}
                    >
                      {round.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(round)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        data-testid={`button-edit-round-${round.id}`}
                      >
                        <span className="text-sm font-semibold">EDIT</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-delete-round-${round.id}`}
                          >
                            <span className="text-sm font-semibold">DEL</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-round-${round.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Round</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this round for {getPlayerName(round.playerId)}? 
                              This action cannot be undone and will affect handicap calculations.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete-round">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRoundMutation.mutate(round.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="button-confirm-delete-round"
                            >
                              Delete Round
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!filteredRounds || filteredRounds.length === 0) && (
          <div className="text-center py-8" data-testid="empty-state-rounds">
            <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rounds found</h3>
            <p className="text-gray-500">
              {selectedPlayer === "all" ? "No rounds have been recorded yet." : "This player hasn't played any rounds yet."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}