import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Target, Trophy } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading, isPreviewMode } = useCurrentPlayer();
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Redirect to login if not authenticated (but not in preview mode)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPreviewMode) {
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
  }, [isAuthenticated, isLoading, isPreviewMode, toast]);

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

  // Fetch monthly stats
  const { data: monthlyStats, isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/players", currentPlayer?.id, "stats", "monthly", selectedMonth],
    enabled: !!currentPlayer,
    retry: false,
  });

  // Fetch cumulative stats
  const { data: cumulativeStats, isLoading: cumulativeLoading } = useQuery({
    queryKey: ["/api/players", currentPlayer?.id, "stats", "cumulative"],
    enabled: !!currentPlayer,
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

  // Filter rounds to show only current player's rounds
  const playerRounds = (recentRounds as any[])?.filter(
    (round: any) => round.playerId === currentPlayer?.id
  ) || [];
  
  // Get current player's most recent round
  const lastRound = playerRounds[0];
  
  // Get the latest handicap snapshot for current player to show previous handicap
  const latestSnapshot = (handicapSnapshots as any[])?.find(
    (snapshot: any) => snapshot.playerId === currentPlayer?.id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center">
          <div className="max-w-7xl mx-auto">
            <span className="font-medium">Preview Mode:</span> Score submission and account changes are disabled
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 py-6 pb-16">
        {/* Status Header */}
        <Card className="mb-4" data-testid="card-status">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900" data-testid="text-status-title">
                Your Golf Status
              </h2>
              <Badge variant="default" className="bg-golf-green" data-testid="badge-season">
                Season Active
              </Badge>
            </div>
            
            {/* Handicap Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
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
                <div className="text-sm text-gray-600">New Handicap</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Round Card - Expanded */}
        {lastRound && (
          <Card className="mb-4 flex-1" data-testid="card-last-round">
            <CardContent className="pt-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900" data-testid="text-last-course">
                    {lastRound.courseName || 'Last Round'}
                  </h3>
                  <p className="text-sm text-gray-600" data-testid="text-last-date">
                    {new Date(lastRound.playedOn).toLocaleDateString()}
                  </p>
                  {lastRound.course?.slope && (
                    <p className="text-xs text-gray-500">
                      Slope: {lastRound.course.slope}
                      {lastRound.slopeAdjustedCourseHandicap !== undefined && lastRound.slopeAdjustedCourseHandicap !== lastRound.courseHandicap && (
                        <> | Course Hcp: {lastRound.slopeAdjustedCourseHandicap}</>
                      )}
                    </p>
                  )}
                </div>
                <Badge variant="outline" data-testid="badge-tees">Blue Tees</Badge>
              </div>
              
              {/* Scorecard with clean table format */}
              <div className="mb-4 flex-1 flex flex-col justify-center">
                <div className="text-sm text-gray-600 mb-3 text-center">Full Scorecard:</div>
                
                {/* Use correct par values */}
                {(() => {
                  const correctPars = [4, 3, 4, 4, 4, 3, 5, 3, 4, 3, 4, 3, 3, 3, 4, 3, 5, 3];
                  const pars = correctPars;
                  
                  return (
                    <div>
                      {/* Front 9 - Header with hole numbers */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-1" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="text-2xs text-gray-600 py-1">Hole</div>
                        {Array.from({length: 9}, (_, i) => (
                          <div key={i} className="text-2xs text-gray-600 py-1">{i + 1}</div>
                        ))}
                        <div className="text-2xs text-gray-600 py-1">OUT</div>
                      </div>
                      
                      {/* Front 9 - Par row */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-0.5" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="bg-gray-100 rounded px-0.5 py-1 border text-2xs text-gray-600">Par</div>
                        {pars.slice(0, 9).map((par: number, index: number) => (
                          <div key={index} className="bg-gray-100 rounded px-0.5 py-1 border" data-testid={`hole-${index + 1}-par`}>
                            <div className="font-medium text-xs">{par}</div>
                          </div>
                        ))}
                        <div className="bg-gray-100 rounded px-0.5 py-1 border font-medium" data-testid="front-nine-par">
                          <div className="font-medium text-xs">{pars.slice(0, 9).reduce((sum: number, par: number) => sum + par, 0)}</div>
                        </div>
                      </div>
                      
                      {/* Front 9 - Score row */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-2" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="bg-gray-50 rounded px-0.5 py-1 border text-2xs text-gray-600">Score</div>
                        {lastRound.cappedScores?.slice(0, 9).map((score: number, index: number) => {
                          const par = pars[index];
                          const isOver = score > par;
                          const isUnder = score < par;
                          const isOneOver = score === par + 1;
                          const isPar = score === par;
                          return (
                            <div key={index} className={`rounded px-0.5 py-0.5 border ${
                              isOneOver ? 'bg-white text-blue-600' : isOver ? 'bg-red-50 text-red-700' : isUnder ? 'bg-green-100 text-green-800' : 'bg-white'
                            }`} data-testid={`hole-${index + 1}-score`}>
                              {isPar ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-gray-300 dark:ring-gray-500 font-bold text-xs leading-none mx-auto">
                                  {score}
                                </span>
                              ) : (
                                <div className="font-bold text-xs">{score}</div>
                              )}
                            </div>
                          );
                        })}
                        <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold" data-testid="front-nine-total">
                          <div className="font-bold text-xs">{lastRound.cappedScores?.slice(0, 9).reduce((sum: number, score: number) => sum + score, 0)}</div>
                        </div>
                      </div>

                      {/* Back 9 - Header with hole numbers */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-1" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="text-2xs text-gray-600 py-1">Hole</div>
                        {Array.from({length: 9}, (_, i) => (
                          <div key={i + 9} className="text-2xs text-gray-600 py-1">{i + 10}</div>
                        ))}
                        <div className="text-2xs text-gray-600 py-1">IN</div>
                      </div>
                      
                      {/* Back 9 - Par row */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-0.5" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="bg-gray-100 rounded px-0.5 py-1 border text-2xs text-gray-600">Par</div>
                        {pars.slice(9, 18).map((par: number, index: number) => (
                          <div key={index + 9} className="bg-gray-100 rounded px-0.5 py-1 border" data-testid={`hole-${index + 10}-par`}>
                            <div className="font-medium text-xs">{par}</div>
                          </div>
                        ))}
                        <div className="bg-gray-100 rounded px-0.5 py-1 border font-medium" data-testid="back-nine-par">
                          <div className="font-medium text-xs">{pars.slice(9, 18).reduce((sum: number, par: number) => sum + par, 0)}</div>
                        </div>
                      </div>
                      
                      {/* Back 9 - Score row */}
                      <div className="grid gap-0.5 text-center text-xs font-mono mb-4" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
                        <div className="bg-gray-50 rounded px-0.5 py-1 border text-2xs text-gray-600">Score</div>
                        {lastRound.cappedScores?.slice(9, 18).map((score: number, index: number) => {
                          const par = pars[index + 9];
                          const isOver = score > par;
                          const isUnder = score < par;
                          const isOneOver = score === par + 1;
                          const isPar = score === par;
                          return (
                            <div key={index + 9} className={`rounded px-0.5 py-0.5 border ${
                              isOneOver ? 'bg-white text-blue-600' : isOver ? 'bg-red-50 text-red-700' : isUnder ? 'bg-green-100 text-green-800' : 'bg-white'
                            }`} data-testid={`hole-${index + 10}-score`}>
                              {isPar ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-gray-300 dark:ring-gray-500 font-bold text-xs leading-none mx-auto">
                                  {score}
                                </span>
                              ) : (
                                <div className="font-bold text-xs">{score}</div>
                              )}
                            </div>
                          );
                        })}
                        <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold" data-testid="back-nine-total">
                          <div className="font-bold text-xs">{lastRound.cappedScores?.slice(9, 18).reduce((sum: number, score: number) => sum + score, 0)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Last Round Summary */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="font-bold text-xl" data-testid="text-last-gross">
                      {lastRound.grossCapped}
                    </div>
                    <div className="text-sm text-gray-600">Gross Score</div>
                  </div>
                  <div>
                    <div className="font-bold text-xl text-golf-blue" data-testid="text-last-net">
                      {lastRound.net}
                    </div>
                    <div className="text-sm text-gray-600">Net Score</div>
                  </div>
                  <div>
                    <div className="font-bold text-xl text-golf-gold" data-testid="text-last-over-par">
                      +{parseFloat(lastRound.overPar).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">Over Par</div>
                  </div>
                  <div>
                    <div className="font-bold text-xl text-purple-600" data-testid="text-last-dth">
                      {(() => {
                        const dth = lastRound.slopeAdjustedDTH !== undefined 
                          ? lastRound.slopeAdjustedDTH 
                          : parseFloat(lastRound.overPar) - lastRound.courseHandicap;
                        return (dth >= 0 ? '+' : '') + dth.toFixed(0);
                      })()} 
                    </div>
                    <div className="text-sm text-gray-600">DTH</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Player Statistics - Cumulative vs Monthly */}
        {playerRounds && playerRounds.length > 0 && (
          <Card data-testid="card-player-stats">
            <CardContent className="pt-4 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center" data-testid="text-player-stats-title">
                Your Statistics
              </h3>
              
              <Tabs defaultValue="cumulative" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="cumulative" data-testid="tab-season-total">
                    <Trophy className="h-4 w-4 mr-2" />
                    Season Total
                  </TabsTrigger>
                  <TabsTrigger value="monthly" data-testid="tab-current-month">
                    <Calendar className="h-4 w-4 mr-2" />
                    This Month
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cumulative">
                  <div className="grid grid-cols-5 gap-3 text-center">
                    <div>
                      <div className="text-lg font-black text-gray-900" data-testid="text-cumulative-rounds">
                        {(cumulativeStats as any)?.roundsCount || playerRounds.length}
                      </div>
                      <div className="text-xs font-semibold text-gray-700">Total Rounds</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-golf-green" data-testid="text-cumulative-avg-gross">
                        {(cumulativeStats as any)?.avgGrossCapped ? Math.round(parseFloat((cumulativeStats as any).avgGrossCapped)) : 
                          Math.round(playerRounds.reduce((sum: number, round: any) => sum + round.grossCapped, 0) / playerRounds.length)}
                      </div>
                      <div className="text-xs font-semibold text-gray-700">Avg Gross</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-golf-blue" data-testid="text-cumulative-avg-net">
                        {(cumulativeStats as any)?.avgNet ? Math.round(parseFloat((cumulativeStats as any).avgNet)) : 
                          Math.round(playerRounds.reduce((sum: number, round: any) => sum + round.net, 0) / playerRounds.length)}
                      </div>
                      <div className="text-xs font-semibold text-gray-700">Avg Net</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-golf-gold" data-testid="text-cumulative-avg-over-par">
                        +{(cumulativeStats as any)?.avgOverPar ? parseFloat((cumulativeStats as any).avgOverPar).toFixed(1) : 
                          (playerRounds.reduce((sum: number, round: any) => sum + parseFloat(round.overPar), 0) / playerRounds.length).toFixed(1)}
                      </div>
                      <div className="text-xs font-semibold text-gray-700">Avg Over</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-purple-600" data-testid="text-cumulative-avg-dth">
                        {(cumulativeStats as any)?.avgDTH ? 
                          (Number((cumulativeStats as any).avgDTH) >= 0 ? '+' : '') + parseFloat((cumulativeStats as any).avgDTH).toFixed(1) : 
                          (() => {
                            const avgDTH = playerRounds.reduce((sum: number, round: any) => sum + (parseFloat(round.overPar) - round.courseHandicap), 0) / playerRounds.length;
                            return (avgDTH >= 0 ? '+' : '') + avgDTH.toFixed(1);
                          })()
                        }
                      </div>
                      <div className="text-xs font-semibold text-gray-700">Avg DTH</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="monthly">
                  {monthlyStats && (monthlyStats as any).roundsCount > 0 ? (
                    <div className="grid grid-cols-5 gap-3 text-center">
                      <div>
                        <div className="text-lg font-black text-gray-900" data-testid="text-monthly-rounds">
                          {(monthlyStats as any).roundsCount}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">Rounds</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-green" data-testid="text-monthly-avg-gross">
                          {Math.round(parseFloat((monthlyStats as any).avgGrossCapped))}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">Avg Gross</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-blue" data-testid="text-monthly-avg-net">
                          {Math.round(parseFloat((monthlyStats as any).avgNet))}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">Avg Net</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-golf-gold" data-testid="text-monthly-avg-over-par">
                          +{parseFloat((monthlyStats as any).avgOverPar).toFixed(1)}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">Avg Over</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-purple-600" data-testid="text-monthly-avg-dth">
                          {(monthlyStats as any).avgDTH ? 
                            (Number((monthlyStats as any).avgDTH) >= 0 ? '+' : '') + parseFloat((monthlyStats as any).avgDTH).toFixed(1) : 
                            'N/A'
                          }
                        </div>
                        <div className="text-xs font-semibold text-gray-700">Avg DTH</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p data-testid="text-no-monthly-rounds">No rounds played this month yet</p>
                      <p className="text-sm mt-2">Start playing to see your monthly statistics!</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
