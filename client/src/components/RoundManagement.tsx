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

  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds"],
    retry: false,
  });

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  const { data: courses } = useQuery({
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

  const handleEdit = (round: Round) => {
    setEditingRound(round);
    setEditScores([...round.rawScores]);
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
    });
  };

  const getPlayerName = (playerId: string) => {
    return players?.find((p: Player) => p.id === playerId)?.name || 'Unknown Player';
  };

  const getCourseName = (courseId: string) => {
    return courses?.find((c: Course) => c.id === courseId)?.name || 'Unknown Course';
  };

  const filteredRounds = rounds?.filter((round: Round) => 
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
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-48" data-testid="select-player-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {players?.map((player: Player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                    <div><strong>Handicap:</strong> {editingRound.courseHandicap}</div>
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
                    {round.overPar > 0 ? '+' : ''}{round.overPar}
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
                        <span className="text-base">✏️</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-delete-round-${round.id}`}
                          >
                            <span className="text-base">🗑️</span>
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