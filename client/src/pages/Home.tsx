import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/courses"],
    retry: false,
  });

  const { data: recentRounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds"],
    retry: false,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    retry: false,
  });

  const { data: handicapSnapshots } = useQuery({
    queryKey: ["/api/handicaps/snapshots"],
    retry: false,
  });

  if (isLoading || playersLoading || coursesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-xl h-48"></div>
            <div className="bg-white rounded-xl h-32"></div>
          </div>
        </div>
      </div>
    );
  }

  // currentPlayer is now from useCurrentPlayer hook - no need to get from players array
  const lastRound = (recentRounds as any[])?.[0];
  
  // Get the latest handicap snapshot for current player to show previous handicap
  const latestSnapshot = (handicapSnapshots as any[])?.find(
    (snapshot: any) => snapshot.playerName === currentPlayer?.name
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Current Status Card */}
        <Card className="mb-6" data-testid="card-status">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900" data-testid="text-status-title">
                Your Golf Status
              </h2>
              <Badge variant="default" className="bg-golf-green" data-testid="badge-season">
                Season Active
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500" data-testid="text-previous-handicap">
                  {latestSnapshot?.prevHandicap || currentPlayer?.currentHandicap || 0}
                </div>
                <div className="text-sm text-gray-600">Previous Handicap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-golf-green" data-testid="text-current-handicap">
                  {currentPlayer?.currentHandicap || 0}
                </div>
                <div className="text-sm text-gray-600">New/Current Handicap</div>
              </div>
            </div>

            {/* Last Round Summary */}
            {lastRound && (
              <div className="bg-gray-50 rounded-lg p-4" data-testid="card-last-round">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900" data-testid="text-last-course">
                      {lastRound.courseName || 'Recent Round'}
                    </h3>
                    <p className="text-sm text-gray-600" data-testid="text-last-date">
                      {new Date(lastRound.playedOn).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" data-testid="badge-tees">Blue Tees</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-bold text-lg" data-testid="text-last-gross">
                      {lastRound.grossCapped}
                    </div>
                    <div className="text-xs text-gray-600">Gross</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-golf-blue" data-testid="text-last-net">
                      {lastRound.net}
                    </div>
                    <div className="text-xs text-gray-600">Net</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-golf-gold" data-testid="text-last-over-par">
                      +{parseFloat(lastRound.overPar).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600">Over Par</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Selection */}
        <Card className="mb-6" data-testid="card-course-selection">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-select-course">
              Select Course
            </h2>
            <div className="space-y-3">
              {courses?.map((course: any, index: number) => (
                <button
                  key={course.id}
                  className={`w-full p-4 border-2 rounded-lg text-left hover:bg-opacity-10 transition-colors ${
                    index === 0 
                      ? 'border-golf-green bg-golf-green bg-opacity-5 hover:bg-golf-green' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setLocation(`/rounds/new?course=${course.id}`)}
                  data-testid={`button-select-course-${course.id}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900" data-testid={`text-course-name-${course.id}`}>
                        {course.name}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid={`text-course-details-${course.id}`}>
                        {course.tees} Tees • Par {course.parTotal}
                      </p>
                    </div>
                    <i className={`fas fa-chevron-right ${index === 0 ? 'text-golf-green' : 'text-gray-400'}`}></i>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => setLocation('/rounds/new')}
            className="bg-golf-green text-white px-6 py-4 text-lg hover:bg-green-700"
            data-testid="button-start-round"
          >
            <i className="fas fa-golf-ball mr-2"></i>Start New Round
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/history')}
            className="border-2 border-golf-blue text-golf-blue px-6 py-4 text-lg hover:bg-golf-blue hover:text-white"
            data-testid="button-view-history"
          >
            <i className="fas fa-chart-line mr-2"></i>View Score History
          </Button>
        </div>
      </main>
    </div>
  );
}
