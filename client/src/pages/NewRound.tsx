import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, MapPin, Calendar, Save, RotateCcw } from "lucide-react";

interface Hole {
  id: string;
  courseId: string;
  number: number;
  par: number;
  distance: number;
}

interface Course {
  id: string;
  name: string;
  tees: string;
  parTotal: number;
  rating: number | null;
  slope: number | null;
}

interface Player {
  id: string;
  name: string;
  email: string | null;
  handicap: number | null;
  isAdmin: boolean;
}

export default function NewRound() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [scores, setScores] = useState<number[]>(Array(18).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization-scoped queries
  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`],
    enabled: !!currentOrganization?.id,
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id,
  });

  const { data: holes, isLoading: holesLoading } = useQuery<Hole[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`, selectedCourseId, "holes"],
    enabled: !!selectedCourseId && !!currentOrganization?.id,
  });

  // Get selected course and player details
  const selectedCourse = courses?.find(course => course.id === selectedCourseId);
  const selectedPlayer = players?.find(player => player.id === selectedPlayerId);

  // Reset scores when course changes
  useEffect(() => {
    if (selectedCourseId) {
      setScores(Array(18).fill(0));
    }
  }, [selectedCourseId]);

  // Create round mutation
  const createRoundMutation = useMutation({
    mutationFn: async (roundData: any) => {
      setIsSubmitting(true);
      try {
        await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/rounds`, roundData);
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps`] });
      
      toast({
        title: "Round Saved!",
        description: "Your golf round has been successfully recorded.",
        variant: "default",
      });
      
      // Navigate back to organization home or leaderboard
      setLocation(`/${currentOrganization?.slug}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Round",
        description: error.message || "Failed to save your round. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScoreChange = (holeIndex: number, score: number) => {
    const newScores = [...scores];
    newScores[holeIndex] = score;
    setScores(newScores);
  };

  const calculateTotalScore = () => {
    return scores.reduce((total, score) => total + score, 0);
  };

  const calculateOverPar = () => {
    if (!selectedCourse) return 0;
    return calculateTotalScore() - selectedCourse.parTotal;
  };

  const isValidRound = () => {
    return selectedCourseId && 
           selectedPlayerId && 
           scores.every(score => score > 0) && 
           calculateTotalScore() > 0;
  };

  const handleSubmit = () => {
    if (!isValidRound()) {
      toast({
        title: "Invalid Round",
        description: "Please select a course, player, and enter all hole scores.",
        variant: "destructive",
      });
      return;
    }

    const roundData = {
      playerId: selectedPlayerId,
      courseId: selectedCourseId,
      scores: scores,
      playedAt: new Date().toISOString(),
    };

    createRoundMutation.mutate(roundData);
  };

  const handleReset = () => {
    setScores(Array(18).fill(0));
    toast({
      title: "Scores Reset",
      description: "All hole scores have been cleared.",
    });
  };

  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return "bg-blue-100 text-blue-800 border-blue-200"; // Eagle or better
    if (diff === -1) return "bg-green-100 text-green-800 border-green-200"; // Birdie
    if (diff === 0) return "bg-gray-100 text-gray-800 border-gray-200"; // Par
    if (diff === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200"; // Bogey
    if (diff === 2) return "bg-orange-100 text-orange-800 border-orange-200"; // Double bogey
    return "bg-red-100 text-red-800 border-red-200"; // Triple bogey or worse
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
              <p className="text-gray-600">Please select an organization to add a new round.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-new-round-title">
            Add New Round - {currentOrganization.name}
          </h1>
          <p className="text-gray-600 mt-2" data-testid="text-new-round-description">
            Record a new golf round for this organization
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Course and Player Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Round Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger data-testid="select-course-new-round">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesLoading ? (
                      <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                    ) : courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id} data-testid={`option-course-${course.id}`}>
                        {course.name} - {course.tees} (Par {course.parTotal})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Player
                </label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger data-testid="select-player-new-round">
                    <SelectValue placeholder="Choose a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {playersLoading ? (
                      <SelectItem value="loading" disabled>Loading players...</SelectItem>
                    ) : players?.map((player) => (
                      <SelectItem key={player.id} value={player.id} data-testid={`option-player-${player.id}`}>
                        {player.name} {player.handicap && `(HCP: ${player.handicap})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCourse && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Course Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Par:</strong> {selectedCourse.parTotal}</p>
                    {selectedCourse.rating && <p><strong>Rating:</strong> {selectedCourse.rating}</p>}
                    {selectedCourse.slope && <p><strong>Slope:</strong> {selectedCourse.slope}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Round Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Round Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900" data-testid="text-total-score">
                    {calculateTotalScore()}
                  </div>
                  <div className="text-sm text-gray-600">Total Score</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900" data-testid="text-over-par">
                    {calculateOverPar() === 0 ? "E" : (calculateOverPar() > 0 ? `+${calculateOverPar()}` : calculateOverPar())}
                  </div>
                  <div className="text-sm text-gray-600">Over Par</div>
                </div>
              </div>

              {selectedPlayer && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Playing</h4>
                  <p className="text-sm text-blue-700">{selectedPlayer.name}</p>
                  {selectedPlayer.handicap && (
                    <p className="text-xs text-blue-600">Handicap: {selectedPlayer.handicap}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isValidRound() || isSubmitting}
                  className="flex-1"
                  data-testid="button-save-round"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save Round"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSubmitting}
                  data-testid="button-reset-scores"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Input Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hole Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCourseId ? (
              <Alert>
                <AlertDescription>
                  Please select a course to begin entering scores.
                </AlertDescription>
              </Alert>
            ) : holesLoading ? (
              <div className="grid grid-cols-6 gap-3">
                {[...Array(18)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({length: 18}, (_, index) => {
                  const holeNumber = index + 1;
                  const holePar = holes?.find(hole => hole.number === holeNumber)?.par || Math.floor(selectedCourse?.parTotal || 72 / 18);
                  const score = scores[index];
                  
                  return (
                    <div key={holeNumber} className="space-y-2">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Hole {holeNumber}</div>
                        <div className="text-xs text-gray-500">Par {holePar}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(scoreValue => (
                          <button
                            key={scoreValue}
                            onClick={() => handleScoreChange(index, scoreValue)}
                            className={`
                              w-full h-8 text-sm font-medium rounded border-2 transition-colors
                              ${score === scoreValue 
                                ? getScoreColor(scoreValue, holePar) + " border-current"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }
                            `}
                            data-testid={`button-score-${holeNumber}-${scoreValue}`}
                          >
                            {scoreValue}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}