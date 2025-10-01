import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
  const { currentPlayer } = useCurrentPlayer();
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
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/players`] });
      
      toast({
        title: "Round Saved!",
        description: "Your golf round has been successfully recorded.",
      });
      
      // Navigate back to organization home
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

  const handleScoreChange = (holeIndex: number, value: string) => {
    const score = parseInt(value) || 0;
    const newScores = [...scores];
    newScores[holeIndex] = score;
    setScores(newScores);
  };

  const calculateGross = () => {
    return scores.reduce((total, score) => total + score, 0);
  };

  const calculateNet = () => {
    const gross = calculateGross();
    const handicap = currentPlayer?.currentHandicap || 0;
    return Math.max(0, gross - handicap);
  };

  const calculateFront9 = () => {
    return scores.slice(0, 9).reduce((total, score) => total + score, 0);
  };

  const calculateBack9 = () => {
    return scores.slice(9, 18).reduce((total, score) => total + score, 0);
  };

  const isValidRound = () => {
    return selectedCourseId && 
           currentPlayer?.id && 
           scores.every(score => score > 0) && 
           calculateGross() > 0;
  };

  const handleSubmit = () => {
    if (!isValidRound()) {
      toast({
        title: "Invalid Round",
        description: "Please select a course and enter all hole scores.",
        variant: "destructive",
      });
      return;
    }

    const roundData = {
      playerId: currentPlayer?.id,
      courseId: selectedCourseId,
      scores: scores,
      playedAt: new Date().toISOString(),
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

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Course Selection */}
        <div>
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
        </div>

        {selectedCourse && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900" data-testid="text-par">
                  {selectedCourse.parTotal}
                </div>
                <div className="text-sm text-gray-600">Par</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900" data-testid="text-gross">
                  {calculateGross()}
                </div>
                <div className="text-sm text-gray-600">Gross</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900" data-testid="text-handicap">
                  {currentPlayer?.currentHandicap || 0}
                </div>
                <div className="text-sm text-gray-600">Handicap</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600" data-testid="text-net">
                  {calculateNet()}
                </div>
                <div className="text-sm text-gray-600">Net</div>
              </div>
            </div>

            {/* Enter Scores Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Scores</h2>

              {/* Front 9 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium text-gray-700">Front 9</h3>
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
                      <div key={holeNumber} className="bg-white rounded-lg p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Hole {holeNumber}</div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Par {holePar}</div>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={scores[index] || ''}
                          onChange={(e) => handleScoreChange(index, e.target.value)}
                          className="w-full text-center h-8 text-lg font-bold mb-1"
                          placeholder={holePar.toString()}
                          data-testid={`input-score-${holeNumber}`}
                        />
                        <div className="text-xs text-gray-400">{holeDistance}y</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back 9 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium text-gray-700">Back 9:</h3>
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
                      <div key={holeNumber} className="bg-white rounded-lg p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Hole {holeNumber}</div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Par {holePar}</div>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={scores[index + 9] || ''}
                          onChange={(e) => handleScoreChange(index + 9, e.target.value)}
                          className="w-full text-center h-8 text-lg font-bold mb-1"
                          placeholder={holePar.toString()}
                          data-testid={`input-score-${holeNumber}`}
                        />
                        <div className="text-xs text-gray-400">{holeDistance}y</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValidRound() || isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-submit-score"
              >
                {isSubmitting ? "Saving..." : "Submit Score"}
              </Button>
            </div>
          </>
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
