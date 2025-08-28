import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function History() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("self");

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

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  // Construct proper query parameters for rounds API
  const roundsPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  
  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds", { playerId: roundsPlayerId }],
    queryFn: ({ queryKey }) => {
      const [, params] = queryKey as [string, { playerId?: string }];
      const searchParams = new URLSearchParams();
      if (params.playerId) searchParams.set('playerId', params.playerId);
      const url = `/api/rounds?${searchParams.toString()}&_t=${Date.now()}`;
      return fetch(url, { 
        credentials: 'include',
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      }).then(res => res.json());
    },
    enabled: !!roundsPlayerId,
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  const displayPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  const displayPlayer = selectedPlayerId === "self" ? currentPlayer : (players as any[])?.find((p: any) => p.id === selectedPlayerId);

  // Enrich rounds with course/player names for display
  const enrichedRounds = rounds ? (rounds as any[]).map((round: any) => ({
    ...round,
    courseName: (courses as any[])?.find((c: any) => c.id === round.courseId)?.name || 'Golf Course',
    playerName: (players as any[])?.find((p: any) => p.id === round.playerId)?.name || 'Unknown Player'
  })) : [];

  // Get last round and calculate summary for the selected player  
  const lastRound = enrichedRounds && enrichedRounds.length > 0 ? enrichedRounds[0] : null;
  
  const calculateSummary = () => {
    if (!rounds || (rounds as any[]).length === 0) {
      return { roundsPlayed: 0, avgGross: 0, avgNet: 0, avgOverPar: 0 };
    }

    const roundsPlayed = (rounds as any[]).length;
    const avgGross = (rounds as any[]).reduce((sum: number, round: any) => sum + round.grossCapped, 0) / roundsPlayed;
    const avgNet = (rounds as any[]).reduce((sum: number, round: any) => sum + round.net, 0) / roundsPlayed;
    const avgOverPar = (rounds as any[]).reduce((sum: number, round: any) => sum + parseFloat(round.overPar), 0) / roundsPlayed;

    return {
      roundsPlayed,
      avgGross: Math.round(avgGross),
      avgNet: Math.round(avgNet),
      avgOverPar: avgOverPar.toFixed(1),
    };
  };

  const summary = calculateSummary();

  // Render compact scorecard component
  const renderScorecard = (round: any) => {
    if (!round.cappedScores || round.cappedScores.length !== 18) {
      return (
        <div className="text-xs text-gray-500 text-center py-2">
          Scorecard data not available
        </div>
      );
    }

    return (
      <div className="mb-2">
        {/* Front 9 */}
        <div className="grid grid-cols-10 gap-0.5 text-center text-xs font-mono mb-0.5">
          {round.cappedScores.slice(0, 9).map((score: number, index: number) => (
            <div key={index} className="bg-white rounded px-0.5 py-1 border" data-testid={`hole-${index + 1}-score`}>
              <div className="text-2xs text-gray-500">{index + 1}</div>
              <div className="font-bold text-xs">{score}</div>
            </div>
          ))}
          <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold" data-testid="front-nine-total">
            <div className="text-2xs">OUT</div>
            <div className="font-bold text-xs">{round.cappedScores.slice(0, 9).reduce((sum: number, score: number) => sum + score, 0)}</div>
          </div>
        </div>
        {/* Back 9 */}
        <div className="grid grid-cols-10 gap-0.5 text-center text-xs font-mono">
          {round.cappedScores.slice(9, 18).map((score: number, index: number) => (
            <div key={index + 9} className="bg-white rounded px-0.5 py-1 border" data-testid={`hole-${index + 10}-score`}>
              <div className="text-2xs text-gray-500">{index + 10}</div>
              <div className="font-bold text-xs">{score}</div>
            </div>
          ))}
          <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold" data-testid="back-nine-total">
            <div className="text-2xs">IN</div>
            <div className="font-bold text-xs">{round.cappedScores.slice(9, 18).reduce((sum: number, score: number) => sum + score, 0)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-3">
        <Card data-testid="card-history">
          <CardContent className="pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-history-title">
              Player History
            </h2>

            {/* Player Selection Tabs */}
            <div className="flex space-x-2 mb-4 overflow-x-auto">
              <Button
                variant={selectedPlayerId === "self" ? "default" : "outline"}
                onClick={() => setSelectedPlayerId("self")}
                className={selectedPlayerId === "self" ? "bg-golf-green text-white" : ""}
                data-testid="button-select-self"
              >
                Your History
              </Button>
              {(players as any[])?.filter((p: any) => p.id !== currentPlayer?.id).map((player: any) => (
                <Button
                  key={player.id}
                  variant={selectedPlayerId === player.id ? "default" : "outline"}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`whitespace-nowrap ${selectedPlayerId === player.id ? "bg-golf-green text-white" : ""}`}
                  data-testid={`button-select-player-${player.id}`}
                >
                  {player.name}
                </Button>
              ))}
            </div>

            {/* Selected Player's Last Round and Summary */}
            {roundsLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse border border-gray-200 rounded-lg p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : lastRound ? (
              <div className="space-y-4">
                {/* Compact Player Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900" data-testid="text-selected-player-name">
                      {displayPlayer?.name || 'Unknown Player'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Handicap: <span className="font-medium">{displayPlayer?.currentHandicap || 0}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Last Round</div>
                    <div className="font-medium text-sm">{lastRound.courseName}</div>
                    <div className="text-xs text-gray-500">{new Date(lastRound.playedOn).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Compact Last Round & Summary Combined */}
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    {renderScorecard(lastRound)}
                    
                    {/* Combined Stats - Last Round + Season Summary */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="font-bold text-base" data-testid="text-last-gross">
                            {lastRound.grossCapped}
                          </div>
                          <div className="text-2xs text-gray-600">Last Gross</div>
                        </div>
                        <div>
                          <div className="font-bold text-base text-golf-blue" data-testid="text-last-net">
                            {lastRound.net}
                          </div>
                          <div className="text-2xs text-gray-600">Last Net</div>
                        </div>
                        <div>
                          <div className="font-bold text-base text-golf-gold" data-testid="text-last-over-par">
                            +{parseFloat(lastRound.overPar).toFixed(0)}
                          </div>
                          <div className="text-2xs text-gray-600">Last Over</div>
                        </div>
                      </div>
                      
                      {/* Season Averages */}
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2 text-center">Season Averages</div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div>
                            <div className="text-lg font-black text-gray-900" data-testid="text-summary-rounds">
                              {summary.roundsPlayed}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Rounds</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-green" data-testid="text-summary-avg-gross">
                              {summary.avgGross}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Gross</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-blue" data-testid="text-summary-avg-net">
                              {summary.avgNet}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Net</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-gold" data-testid="text-summary-avg-over-par">
                              +{summary.avgOverPar}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Over</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8" data-testid="empty-state-rounds">
                <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rounds found</h3>
                <p className="text-gray-500">
                  {displayPlayer?.name || 'This player'} hasn't played any rounds yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
