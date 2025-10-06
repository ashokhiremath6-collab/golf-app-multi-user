import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationPlayer } from "@/hooks/useOrganizationPlayer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
  currentHandicap: number;
  isAdmin: boolean;
}

export default function NewRound() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { currentPlayer } = useOrganizationPlayer();
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [scores, setScores] = useState<number[]>(Array(18).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization-scoped queries
  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`],
    enabled: !!currentOrganization?.id,
  });

  const { data: holes, isLoading: holesLoading } = useQuery<Hole[]>({
    queryKey: [`/api/courses/${selectedCourseId}/holes`],
    enabled: !!selectedCourseId,
  });

  // Get selected course details
  const selectedCourse = courses?.find(course => course.id === selectedCourseId);

  // Create a map of hole number to par for efficient lookups
  const holeParMap = holes?.reduce((map, hole) => {
    map[hole.number] = hole.par;
    return map;
  }, {} as Record<number, number>) || {};

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
        await apiRequest("POST", "/api/rounds", roundData);
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps`], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ["/api/players"], refetchType: 'all' }),
      ]);
      
      toast({
        title: "Round Saved!",
        description: "Your golf round has been successfully recorded.",
      });
      
      // Small delay to ensure cache has updated before navigation
      setTimeout(() => {
        setLocation(`/${currentOrganization?.slug}`);
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Round",
        description: error.message || "Failed to save your round. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScoreChange = (holeIndex: number, value: string) => {
    const newScores = [...scores];
    
    // Allow empty input
    if (value === '') {
      newScores[holeIndex] = 0;
      setScores(newScores);
      return;
    }
    
    // Parse the numeric value - accept any digits typed
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      newScores[holeIndex] = 0;
      setScores(newScores);
      return;
    }
    
    const score = parseInt(numericValue, 10);
    
    // Only clamp if valid number
    if (!isNaN(score)) {
      // Clamp score to valid range [1, 10]
      const clampedScore = Math.max(1, Math.min(10, score));
      newScores[holeIndex] = clampedScore;
      setScores(newScores);
    }
  };

  const calculateGross = () => {
    if (!holes || holes.length !== 18) return 0;
    
    return scores.reduce((total, score, index) => {
      const holePar = holeParMap[index + 1];
      if (holePar == null) return total; // Skip if par not available
      // If score is 0 (empty), use par
      const actualScore = score === 0 ? holePar : score;
      return total + actualScore;
    }, 0);
  };

  const calculateNet = () => {
    const gross = calculateGross();
    const handicap = currentPlayer?.currentHandicap || 0;
    return Math.max(0, gross - handicap);
  };

  const calculateFront9 = () => {
    if (!holes || holes.length !== 18) return 0;
    
    return scores.slice(0, 9).reduce((total, score, index) => {
      const holePar = holeParMap[index + 1];
      if (holePar == null) return total; // Skip if par not available
      // If score is 0 (empty), use par
      const actualScore = score === 0 ? holePar : score;
      return total + actualScore;
    }, 0);
  };

  const calculateBack9 = () => {
    if (!holes || holes.length !== 18) return 0;
    
    return scores.slice(9, 18).reduce((total, score, index) => {
      const holePar = holeParMap[index + 10];
      if (holePar == null) return total; // Skip if par not available
      // If score is 0 (empty), use par
      const actualScore = score === 0 ? holePar : score;
      return total + actualScore;
    }, 0);
  };

  const isValidRound = (): boolean => {
    return Boolean(selectedCourseId) && 
           Boolean(currentPlayer?.id) && 
           !holesLoading && 
           Array.isArray(holes) && 
           holes.length === 18;
  };

  const handleSubmit = () => {
    if (!isValidRound()) {
      const message = !currentPlayer?.id
        ? "No player selected or session expired. Please refresh the page."
        : holesLoading 
        ? "Please wait for course data to load before submitting."
        : !holes || holes.length !== 18
        ? "Course data is incomplete. Please try selecting the course again."
        : "Please select a course to submit a round.";
      
      toast({
        title: "Cannot Submit Round",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Validate that all par values exist in the map (holes 1-18)
    for (let i = 1; i <= 18; i++) {
      if (holeParMap[i] == null) {
        toast({
          title: "Invalid Course Data",
          description: "Course data is invalid or incomplete. Please try selecting the course again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Fill in par scores for any empty holes (score = 0) using the par map
    const finalScores = scores.map((score, index) => {
      if (score === 0) {
        return holeParMap[index + 1];
      }
      return score;
    });

    // Final validation: ensure all scores are valid integers in range [1, 10]
    for (let i = 0; i < finalScores.length; i++) {
      const score = finalScores[i];
      if (!Number.isInteger(score) || score < 1 || score > 10) {
        toast({
          title: "Invalid Scores",
          description: `Invalid score detected for hole ${i + 1}. All scores must be between 1 and 10.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Backend will automatically calculate slope-adjusted course handicap
    const roundData = {
      courseId: selectedCourseId,
      rawScores: finalScores,
      playedOn: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      organizationId: currentOrganization?.id, // Include organization context
    };

    createRoundMutation.mutate(roundData);
  };

  const handleCancel = () => {
    setLocation(`/${currentOrganization?.slug}`);
  };

  // Show loading state while organization loads
  if (!currentOrganization || coursesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="bg-white rounded-xl h-96"></div>
        </div>
      </div>
    );
  }

  // Show alert if user doesn't have a player profile in this organization
  if (!currentPlayer) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Alert variant="destructive" data-testid="alert-no-player-profile">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Player Profile Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You need to be added as a player in this organization before you can submit rounds.
            </p>
            <p className="font-semibold">
              If you're an admin: Go to the Admin tab → Players → Add Player, and add yourself using your login email.
            </p>
            <p>
              If you're not an admin: Please contact your organization admin to add you as a player.
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setLocation(`/${currentOrganization?.slug}/admin`)}
                data-testid="button-go-to-admin"
              >
                Go to Admin Panel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {/* Course Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Played
          </label>
          <Input 
            type="date" 
            defaultValue={new Date().toISOString().split('T')[0]}
            className="bg-white mb-4"
          />
          
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course
          </label>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-full bg-white" data-testid="select-course">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses?.map((course) => (
                <SelectItem key={course.id} value={course.id} data-testid={`option-course-${course.id}`}>
                  {course.name} - Par {course.parTotal} • Slope {course.slope || 'N/A'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentPlayer && (
            <p className="text-xs text-gray-500 mt-2">
              Using handicap {currentPlayer.currentHandicap} from previous records
            </p>
          )}
        </div>

        {selectedCourse && holes && holes.length === 18 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900" data-testid="text-par">
                  {selectedCourse.parTotal}
                </div>
                <div className="text-sm text-gray-600">Par</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900" data-testid="text-gross">
                  {calculateGross()}
                </div>
                <div className="text-sm text-gray-600">Gross</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900" data-testid="text-handicap">
                  {currentPlayer?.currentHandicap || 0}
                </div>
                <div className="text-sm text-gray-600">Handicap</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600" data-testid="text-net">
                  {calculateNet()}
                </div>
                <div className="text-sm text-gray-600">Net</div>
              </div>
            </div>

            {/* Enter Scores Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Enter Scores</h2>

              {/* Front 9 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Front 9</h3>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-front9-total">
                    {calculateFront9()}
                  </div>
                </div>
                <div className="grid grid-cols-9 gap-2">
                  {Array.from({ length: 9 }, (_, index) => {
                    const holeNumber = index + 1;
                    const hole = holes?.find(h => h.number === holeNumber);
                    const holePar = hole?.par || 4;
                    const holeDistance = hole?.distance || 0;
                    
                    return (
                      <div key={holeNumber} className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                        <div className="text-xs text-gray-500 mb-1">Hole {holeNumber}</div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">Par {holePar}</div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={scores[index] === 0 ? '' : scores[index]}
                          onChange={(e) => handleScoreChange(index, e.target.value)}
                          className="w-full text-center h-12 text-2xl font-bold mb-1 touch-manipulation"
                          placeholder={holePar.toString()}
                          data-testid={`input-score-${holeNumber}`}
                          autoComplete="off"
                        />
                        <div className="text-xs text-gray-400">{holeDistance}y</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Front 9 Total Label */}
              <div className="text-right mb-4">
                <span className="text-sm text-gray-600 mr-2">Front 9:</span>
                <span className="text-2xl font-bold text-green-600">{calculateFront9()}</span>
              </div>

              {/* Back 9 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Back 9</h3>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-back9-total">
                    {calculateBack9()}
                  </div>
                </div>
                <div className="grid grid-cols-9 gap-2">
                  {Array.from({ length: 9 }, (_, index) => {
                    const holeNumber = index + 10;
                    const hole = holes?.find(h => h.number === holeNumber);
                    const holePar = hole?.par || 4;
                    const holeDistance = hole?.distance || 0;
                    
                    return (
                      <div key={holeNumber} className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                        <div className="text-xs text-gray-500 mb-1">Hole {holeNumber}</div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">Par {holePar}</div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={scores[index + 9] === 0 ? '' : scores[index + 9]}
                          onChange={(e) => handleScoreChange(index + 9, e.target.value)}
                          className="w-full text-center h-12 text-2xl font-bold mb-1 touch-manipulation"
                          placeholder={holePar.toString()}
                          data-testid={`input-score-${holeNumber}`}
                          autoComplete="off"
                        />
                        <div className="text-xs text-gray-400">{holeDistance}y</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back 9 Total Label */}
              <div className="text-right">
                <span className="text-sm text-gray-600 mr-2">Back 9:</span>
                <span className="text-2xl font-bold text-green-600">{calculateBack9()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 h-12"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValidRound() || isSubmitting}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-lg"
                data-testid="button-submit-score"
              >
                {isSubmitting ? "Saving..." : "Submit Score"}
              </Button>
            </div>
          </>
        )}

        {selectedCourseId && holesLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading course data...</p>
          </div>
        )}

        {!selectedCourseId && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <p>Please select a course to begin entering scores.</p>
            </CardContent>
          </Card>
        )}
      </main>
  );
}
