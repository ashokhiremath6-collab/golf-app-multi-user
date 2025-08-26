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
    (snapshot: any) => snapshot.playerId === currentPlayer?.id
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
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900" data-testid="text-last-course">
                      {lastRound.courseName || 'Last Round'}
                    </h3>
                    <p className="text-sm text-gray-600" data-testid="text-last-date">
                      {new Date(lastRound.playedOn).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" data-testid="badge-tees">Blue Tees</Badge>
                </div>
                
                {/* Full Scorecard - First Line */}
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">Scorecard:</div>
                  <div className="grid grid-cols-10 gap-1 text-center text-sm font-mono">
                    {lastRound.cappedScores?.slice(0, 9).map((score: number, index: number) => (
                      <div key={index} className="bg-white rounded px-1 py-1 border" data-testid={`hole-${index + 1}-score`}>
                        <div className="text-xs text-gray-500">{index + 1}</div>
                        <div className="font-bold">{score}</div>
                      </div>
                    ))}
                    <div className="bg-golf-green text-white rounded px-1 py-1 border font-bold" data-testid="front-nine-total">
                      <div className="text-xs">OUT</div>
                      <div className="font-bold">{lastRound.cappedScores?.slice(0, 9).reduce((sum: number, score: number) => sum + score, 0)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-10 gap-1 text-center text-sm font-mono mt-1">
                    {lastRound.cappedScores?.slice(9, 18).map((score: number, index: number) => (
                      <div key={index + 9} className="bg-white rounded px-1 py-1 border" data-testid={`hole-${index + 10}-score`}>
                        <div className="text-xs text-gray-500">{index + 10}</div>
                        <div className="font-bold">{score}</div>
                      </div>
                    ))}
                    <div className="bg-golf-green text-white rounded px-1 py-1 border font-bold" data-testid="back-nine-total">
                      <div className="text-xs">IN</div>
                      <div className="font-bold">{lastRound.cappedScores?.slice(9, 18).reduce((sum: number, score: number) => sum + score, 0)}</div>
                    </div>
                  </div>
                </div>

                {/* Summary - Second Line */}
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

        {/* Overall Summary Statistics */}
        {recentRounds && (recentRounds as any[]).length > 0 && (
          <Card className="mb-6" data-testid="card-overall-summary">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-overall-summary">
                Your Season Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-gray-900" data-testid="text-summary-rounds">
                    {(recentRounds as any[]).length}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Rounds Played</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-golf-green" data-testid="text-summary-avg-gross">
                    {Math.round((recentRounds as any[]).reduce((sum: number, round: any) => sum + round.grossCapped, 0) / (recentRounds as any[]).length)}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Avg Gross</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-golf-blue" data-testid="text-summary-avg-net">
                    {Math.round((recentRounds as any[]).reduce((sum: number, round: any) => sum + round.net, 0) / (recentRounds as any[]).length)}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Avg Net</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-golf-gold" data-testid="text-summary-avg-over-par">
                    +{((recentRounds as any[]).reduce((sum: number, round: any) => sum + parseFloat(round.overPar), 0) / (recentRounds as any[]).length).toFixed(1)}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Avg Over Par</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
