import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();

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

  // currentPlayer is now from useCurrentPlayer hook
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
            <div className="w-full">
              <table className="w-full" data-testid="table-leaderboard">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">
                      Rank
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Player
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                      Rounds
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 w-24">
                      Avg Net
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                      HCP
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
                        <td className="px-2 py-4">
                          <div className="flex items-center justify-center">
                            <span className={`text-lg font-bold ${rankInfo.color || 'text-gray-500'}`} data-testid={`text-rank-${rank}`}>
                              {rank}
                            </span>
                            {rankInfo.icon && (
                              <i className={`${rankInfo.icon} ${rankInfo.color} ml-1 text-sm`} data-testid={`icon-rank-${rank}`}></i>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <div className="font-medium text-gray-900 text-sm" data-testid={`text-player-name-${player.playerId}`}>
                            {player.playerName}
                            {isCurrentPlayer && (
                              <span className="text-xs text-golf-green ml-1" data-testid="badge-current-player">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500" data-testid={`text-last-round-${player.playerId}`}>
                            {player.lastRoundDate ? new Date(player.lastRoundDate).toLocaleDateString() : 'No rounds'}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center font-medium" data-testid={`text-rounds-count-${player.playerId}`}>
                          {player.roundsCount || 0}
                        </td>
                        <td className="px-2 py-4 text-center">
                          <span 
                            className={`text-lg font-bold ${
                              rank === 1 ? 'text-golf-green' : 
                              rank === 2 ? 'text-golf-blue' : 
                              rank === 3 ? 'text-golf-gold' : 'text-gray-600'
                            }`}
                            data-testid={`text-avg-net-${player.playerId}`}
                          >
                            {player.avgNet ? parseFloat(player.avgNet).toFixed(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-handicap-${player.playerId}`}>
                            {player.currentHandicap}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
