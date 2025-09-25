import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgSession } from "@/hooks/useOrgSession";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import ScoreGrid from "@/components/ScoreGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function NewRound() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading, isPreviewMode } = useCurrentPlayer();
  const { currentOrganization } = useOrganization();
  const { isValid: hasOrgSession, isLoading: orgSessionLoading, handleAuthError } = useOrgSession();
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [scores, setScores] = useState<number[]>(Array(18).fill(0));
  const [roundSubmitted, setRoundSubmitted] = useState<boolean>(false);

  // Show graceful auth handling instead of hard redirects
  const isAuthReady = isPreviewMode || (isAuthenticated && hasOrgSession);
  const isAuthLoading = isLoading || orgSessionLoading;

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`],
    enabled: !!currentOrganization?.id && isAuthReady,
    retry: (failureCount, error) => {
      // Use org session to handle auth errors gracefully
      if (handleAuthError(error)) {
        return failureCount < 2; // Retry up to 2 times after session refresh
      }
      return failureCount < 3;
    },
  });

  const { data: holes, isLoading: holesLoading, error: holesError } = useQuery<Hole[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`, selectedCourseId, "holes"],
    enabled: !!selectedCourseId && !!currentOrganization?.id && isAuthReady,
    retry: (failureCount, error) => {
      if (handleAuthError(error)) {
        return failureCount < 2;
      }
      return failureCount < 3;
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: async (roundData: any) => {
      await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/rounds`, roundData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`] });
      setRoundSubmitted(true);
      toast({
        title: "Success",
        description: "Round saved successfully!",
      });
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error) => {
      if (isUnauthorizedError(error) && !handleAuthError(error)) {
        // Only redirect if org session handler couldn't resolve it
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
        description: "Failed to save round. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isAuthLoading || coursesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="bg-white rounded-xl h-96"></div>
        </div>
      </div>
    );
  }

  // Show auth error state instead of blank screen
  if (!isAuthReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-yellow-600 mb-4">
              <i className="fas fa-clock text-4xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Organization
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your access to this organization...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCourse = (courses as any[])?.find((c: any) => c.id === selectedCourseId);
  const courseHandicap = currentPlayer?.currentHandicap || 0;

  const handleScoreChange = (holeIndex: number, score: number) => {
    const newScores = [...scores];
    newScores[holeIndex] = score;
    setScores(newScores);
  };

  const calculateTotals = () => {
    if (!holes || !selectedCourse) return { gross: 0, capped: 0, net: 0, overPar: 0 };

    // Use par as default if no score entered
    const finalScores = scores.map((score, index) => score || holes[index]?.par || 0);
    const gross = finalScores.reduce((sum, score) => sum + score, 0);
    
    // Calculate capped scores (double bogey cap)
    const cappedScores = finalScores.map((score, index) => {
      if (!holes[index]) return 0;
      const par = holes[index].par;
      return Math.min(score, par + 2);
    });
    
    const capped = cappedScores.reduce((sum, score) => sum + score, 0);
    const net = gross - courseHandicap;  // Net = Gross - Handicap
    const overPar = gross - selectedCourse.parTotal;  // Over Par = Gross - Course Par

    return { gross, capped, net, overPar };
  };

  const handleSubmit = () => {
    if (isPreviewMode) {
      toast({
        title: "Preview Mode",
        description: "Score submission is disabled in preview mode",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course",
        variant: "destructive",
      });
      return;
    }

    if (!currentPlayer) {
      toast({
        title: "Error",
        description: "Player not found",
        variant: "destructive",
      });
      return;
    }

    // Use par as default for empty scores before submission
    const finalScores = scores.map((score, index) => score || holes?.[index]?.par || 0);
    const validScores = finalScores.every(score => score > 0 && score <= 10);
    if (!validScores) {
      toast({
        title: "Error",
        description: "Please enter valid scores for all 18 holes (1-10)",
        variant: "destructive",
      });
      return;
    }

    const roundData = {
      playerId: currentPlayer.id,
      courseId: selectedCourseId,
      playedOn: new Date().toISOString().split('T')[0],
      rawScores: finalScores,
      courseHandicap,
      source: 'app',
    };

    createRoundMutation.mutate(roundData);
  };

  const totals = calculateTotals();

  return (
    <>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center">
          <div className="max-w-7xl mx-auto">
            <span className="font-medium">Preview Mode:</span> Score submission and account changes are disabled
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 py-3 pb-24">
        <Card data-testid="card-new-round">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900" data-testid="text-new-round-title">
                New Round
              </h2>
              {selectedCourse && (
                <div className="text-right">
                  <div className="text-sm text-gray-600" data-testid="text-selected-course">
                    {selectedCourse.name}
                  </div>
                  <div className="text-xs text-gray-500" data-testid="text-course-info">
                    {selectedCourse.tees} Tees • Par {selectedCourse.parTotal} {selectedCourse.slope && `• Slope ${selectedCourse.slope}`}
                  </div>
                </div>
              )}
            </div>

            {/* Course Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <Select value={selectedCourseId} onValueChange={(courseId) => {
                setSelectedCourseId(courseId);
                setScores(Array(18).fill(0));
                setRoundSubmitted(false);
              }}>
                <SelectTrigger data-testid="select-course">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses as any[])?.map((course: any) => (
                    <SelectItem key={course.id} value={course.id} data-testid={`select-course-${course.id}`}>
                      {course.name} - Par {course.parTotal} {course.slope && `• Slope ${course.slope}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCourse && (
              <>
                {/* Compact Course Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4" data-testid="card-course-summary">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-base font-bold" data-testid="text-course-par">
                        {selectedCourse.parTotal}
                      </div>
                      <div className="text-2xs text-gray-600">Par</div>
                    </div>
                    <div>
                      <div className="text-base font-bold" data-testid="text-gross-score">
                        {totals.gross || 0}
                      </div>
                      <div className="text-2xs text-gray-600">Gross</div>
                    </div>
                    <div>
                      <div className="text-base font-bold" data-testid="text-handicap">
                        {courseHandicap}
                      </div>
                      <div className="text-2xs text-gray-600">Handicap</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-golf-blue" data-testid="text-net">
                        {totals.net || 0}
                      </div>
                      <div className="text-2xs text-gray-600">Net</div>
                    </div>
                  </div>
                </div>

                {/* Score Entry */}
                <div className="mb-4">
                  {!holesLoading && holes && (
                    <ScoreGrid
                      holes={holes}
                      scores={scores}
                      onScoreChange={handleScoreChange}
                    />
                  )}
                </div>

                {/* Round Summary - Only show after submission */}
                {roundSubmitted && (
                  <div className="bg-golf-green bg-opacity-5 border border-golf-green rounded-lg p-3 mb-4" data-testid="card-round-summary">
                    <h3 className="font-medium text-gray-900 mb-2" data-testid="text-summary-title">
                      Round Summary
                    </h3>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <div className="text-lg font-black text-gray-900" data-testid="text-summary-gross">
                          {totals.gross}
                        </div>
                        <div className="text-2xs font-semibold text-gray-700">Gross</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-green" data-testid="text-summary-capped">
                          {totals.capped}
                        </div>
                        <div className="text-2xs font-semibold text-gray-700">Capped</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-blue" data-testid="text-summary-net">
                          {totals.net}
                        </div>
                        <div className="text-2xs font-semibold text-gray-700">Net</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-gold" data-testid="text-summary-over-par">
                          {totals.overPar > 0 ? '+' : ''}{totals.overPar}
                        </div>
                        <div className="text-2xs font-semibold text-gray-700">Over Par</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Optimized spacing */}
                <div className="flex space-x-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setLocation('/')}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createRoundMutation.isPending || isPreviewMode}
                    className="flex-1 bg-golf-green hover:bg-green-700"
                    data-testid="button-submit-round"
                  >
                    {createRoundMutation.isPending ? "Saving..." : isPreviewMode ? "Preview Mode" : "Submit Score"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
