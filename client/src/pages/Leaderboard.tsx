import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    retry: false,
  });

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  if (isLoading || leaderboardLoading) {
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

  const currentPlayer = players?.[0]; // In real app, get by current user
  const totalRounds = leaderboard?.reduce((sum: number, player: any) => sum + (player.roundsCount || 0), 0) || 0;
  const avgOverParAll = leaderboard?.length > 0 
    ? (leaderboard.reduce((sum: number, player: any) => sum + parseFloat(player.avgOverPar || 0), 0) / leaderboard.length).toFixed(1)
    : '0.0';

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: 'fas fa-trophy', color: 'text-golf-gold' };
    if (rank === 2) return { icon: 'fas fa-medal', color: 'text-gray-400' };
    if (rank === 3) return { icon: 'fas fa-medal', color: 'text-orange-600' };
    return { icon: '', color: '' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card data-testid="card-leaderboard">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-leaderboard-title">
                Season Leaderboard
              </h2>
              <div className="text-right">
                <div className="text-sm text-gray-600" data-testid="text-season-info">
                  2024-25 Season
                </div>
                <div className="text-xs text-gray-500">Ends Mar 31, 2026</div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-leaderboard">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Player
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Rounds
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                      Avg Over Par <i className="fas fa-sort ml-1"></i>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Current HCP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard?.map((player: any, index: number) => {
                    const rank = index + 1;
                    const rankInfo = getRankIcon(rank);
                    const isCurrentPlayer = currentPlayer && player.playerId === currentPlayer.id;

                    return (
                      <tr 
                        key={player.playerId} 
                        className={`hover:bg-gray-50 ${isCurrentPlayer ? 'bg-green-50 border border-golf-green' : ''}`}
                        data-testid={`row-player-${player.playerId}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${rankInfo.color || 'text-gray-500'}`} data-testid={`text-rank-${rank}`}>
                              {rank}
                            </span>
                            {rankInfo.icon && (
                              <i className={`${rankInfo.icon} ${rankInfo.color} ml-2`} data-testid={`icon-rank-${rank}`}></i>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900" data-testid={`text-player-name-${player.playerId}`}>
                            {player.playerName}
                            {isCurrentPlayer && (
                              <span className="text-xs text-golf-green ml-2" data-testid="badge-current-player">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500" data-testid={`text-last-round-${player.playerId}`}>
                            {player.lastRoundDate ? `Last round: ${new Date(player.lastRoundDate).toLocaleDateString()}` : 'No rounds yet'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-medium" data-testid={`text-rounds-count-${player.playerId}`}>
                          {player.roundsCount || 0}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span 
                            className={`text-lg font-bold ${
                              rank === 1 ? 'text-golf-green' : 
                              rank === 2 ? 'text-golf-blue' : 
                              rank === 3 ? 'text-golf-gold' : 'text-gray-600'
                            }`}
                            data-testid={`text-avg-over-par-${player.playerId}`}
                          >
                            {player.avgOverPar ? `+${parseFloat(player.avgOverPar).toFixed(1)}` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="outline" data-testid={`badge-handicap-${player.playerId}`}>
                            {player.currentHandicap}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stats Summary */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center" data-testid="stat-active-players">
                <div className="text-2xl font-bold text-golf-green" data-testid="text-active-players">
                  {leaderboard?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Active Players</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center" data-testid="stat-total-rounds">
                <div className="text-2xl font-bold text-golf-blue" data-testid="text-total-rounds">
                  {totalRounds}
                </div>
                <div className="text-sm text-gray-600">Total Rounds</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center" data-testid="stat-avg-over-par">
                <div className="text-2xl font-bold text-golf-gold" data-testid="text-avg-over-par-all">
                  +{avgOverParAll}
                </div>
                <div className="text-sm text-gray-600">Avg Over Par</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
