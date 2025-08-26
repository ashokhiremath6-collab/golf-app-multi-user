import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import RoundHistory from "@/components/RoundHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function History() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("self");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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
  });


  // Construct proper query parameters for rounds API
  const roundsPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  const roundsMonth = selectedMonth === "all" ? undefined : selectedMonth;
  
  // Fetch all rounds for all players to show each player's last round
  const { data: allRounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds"],
    retry: false,
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

  // Get the last round for each player
  const getLastRoundForEachPlayer = () => {
    if (!allRounds || !players) return [];
    
    return (players as any[]).map((player: any) => {
      const playerRounds = (allRounds as any[]).filter((round: any) => round.playerId === player.id);
      const lastRound = playerRounds.length > 0 ? playerRounds[0] : null; // rounds are already sorted by date desc
      return {
        player,
        lastRound
      };
    }).filter(item => item.lastRound); // Only show players who have played rounds
  };

  const playersWithLastRounds = getLastRoundForEachPlayer();

  // Render scorecard component similar to Home page
  const renderScorecard = (round: any) => {
    if (!round.cappedScores || round.cappedScores.length !== 18) {
      return (
        <div className="text-sm text-gray-500 text-center py-4">
          Scorecard data not available
        </div>
      );
    }

    return (
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-2">Scorecard:</div>
        {/* Front 9 */}
        <div className="grid grid-cols-10 gap-1 text-center text-sm font-mono mb-1">
          {round.cappedScores.slice(0, 9).map((score: number, index: number) => (
            <div key={index} className="bg-white rounded px-1 py-1 border" data-testid={`hole-${index + 1}-score`}>
              <div className="text-xs text-gray-500">{index + 1}</div>
              <div className="font-bold">{score}</div>
            </div>
          ))}
          <div className="bg-golf-green text-white rounded px-1 py-1 border font-bold" data-testid="front-nine-total">
            <div className="text-xs">OUT</div>
            <div className="font-bold">{round.cappedScores.slice(0, 9).reduce((sum: number, score: number) => sum + score, 0)}</div>
          </div>
        </div>
        {/* Back 9 */}
        <div className="grid grid-cols-10 gap-1 text-center text-sm font-mono">
          {round.cappedScores.slice(9, 18).map((score: number, index: number) => (
            <div key={index + 9} className="bg-white rounded px-1 py-1 border" data-testid={`hole-${index + 10}-score`}>
              <div className="text-xs text-gray-500">{index + 10}</div>
              <div className="font-bold">{score}</div>
            </div>
          ))}
          <div className="bg-golf-green text-white rounded px-1 py-1 border font-bold" data-testid="back-nine-total">
            <div className="text-xs">IN</div>
            <div className="font-bold">{round.cappedScores.slice(9, 18).reduce((sum: number, score: number) => sum + score, 0)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card data-testid="card-history">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6" data-testid="text-history-title">
              Last Rounds - All Players
            </h2>

            {/* Players' Last Rounds */}
            {roundsLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : playersWithLastRounds.length > 0 ? (
              <div className="space-y-6">
                {playersWithLastRounds.map(({ player, lastRound }) => (
                  <Card key={player.id} className="border-2" data-testid={`card-player-${player.id}`}>
                    <CardContent className="pt-6">
                      {/* Player Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-player-name-${player.id}`}>
                            {player.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Current Handicap: <span className="font-medium">{player.currentHandicap}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Last Round</div>
                          <div className="font-medium">{lastRound.courseName}</div>
                          <div className="text-sm text-gray-500">{new Date(lastRound.playedOn).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Last Round Scorecard */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        {renderScorecard(lastRound)}
                        
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="font-bold text-lg" data-testid={`text-gross-${player.id}`}>
                              {lastRound.grossCapped}
                            </div>
                            <div className="text-xs text-gray-600">Gross</div>
                          </div>
                          <div>
                            <div className="font-bold text-lg text-golf-blue" data-testid={`text-net-${player.id}`}>
                              {lastRound.net}
                            </div>
                            <div className="text-xs text-gray-600">Net</div>
                          </div>
                          <div>
                            <div className="font-bold text-lg text-golf-gold" data-testid={`text-over-par-${player.id}`}>
                              +{parseFloat(lastRound.overPar).toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-600">Over Par</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-testid="empty-state-rounds">
                <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rounds found</h3>
                <p className="text-gray-500">No players have played any rounds yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
