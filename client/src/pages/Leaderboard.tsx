import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, History, Trophy } from "lucide-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [activeTab, setActiveTab] = useState('cumulative');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const { data: cumulativeLeaderboard, isLoading: cumulativeLoading } = useQuery({
    queryKey: ["/api/leaderboard/cumulative"],
    retry: false,
  });

  const { data: monthlyLeaderboard, isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/leaderboard/monthly", selectedMonth],
    retry: false,
  });

  const { data: monthlyWinners } = useQuery({
    queryKey: ["/api/monthly-winners"],
    retry: false,
  });

  const getCurrentMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  const leaderboard = activeTab === 'cumulative' ? cumulativeLeaderboard : monthlyLeaderboard;
  const leaderboardLoading = activeTab === 'cumulative' ? cumulativeLoading : monthlyLoading;

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

  // Calculate summary stats for current leaderboard
  const totalRounds = Array.isArray(leaderboard) ? leaderboard.reduce((sum: number, player: any) => sum + (player.roundsCount || 0), 0) : 0;
  const avgOverParAll = Array.isArray(leaderboard) && leaderboard.length > 0 
    ? (leaderboard.reduce((sum: number, player: any) => sum + parseFloat(player.avgOverPar || 0), 0) / leaderboard.length).toFixed(1)
    : '0.0';

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: 'fas fa-trophy', color: 'text-golf-gold' };
    if (rank === 2) return { icon: 'fas fa-medal', color: 'text-gray-400' };
    if (rank === 3) return { icon: 'fas fa-medal', color: 'text-orange-600' };
    return { icon: '', color: '' };
  };

  const renderLeaderboardContent = (data: any, totalRounds: number, avgOverParAll: string) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No rounds found for this period
        </div>
      );
    }

    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6 text-center">
          <div>
            <div className="text-lg font-black text-gray-900" data-testid="text-total-rounds">
              {totalRounds}
            </div>
            <div className="text-xs font-semibold text-gray-600">Total Rounds</div>
          </div>
          <div>
            <div className="text-lg font-black text-golf-green" data-testid="text-avg-net">
              {(data.reduce((sum: number, p: any) => sum + parseFloat(p.avgNet || 0), 0) / data.length).toFixed(1)}
            </div>
            <div className="text-xs font-semibold text-gray-600">Avg Net</div>
          </div>
          <div>
            <div className="text-lg font-black text-golf-gold" data-testid="text-avg-over-par">
              +{avgOverParAll}
            </div>
            <div className="text-xs font-semibold text-gray-600">Avg Over</div>
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
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                  Avg Net
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                  HCP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((player: any, index: number) => {
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
                          <Badge variant="secondary" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className="text-sm text-gray-900 font-semibold" data-testid={`text-rounds-${player.playerId}`}>
                        {player.roundsCount || 0}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className="text-sm font-black text-golf-blue" data-testid={`text-avg-net-${player.playerId}`}>
                        {parseFloat(player.avgNet || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className="text-sm text-gray-700 font-semibold" data-testid={`text-handicap-${player.playerId}`}>
                        {player.currentHandicap}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-3">
        <Card data-testid="card-leaderboard">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900" data-testid="text-leaderboard-title">
                  Golf Leaderboards
                </h2>
                <div className="text-xs text-gray-600" data-testid="text-season-info">
                  2024-25 Season
                </div>
              </div>
              <Link href="/leaderboard-history">
                <Button variant="outline" size="sm" data-testid="button-view-history">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </Link>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="cumulative" data-testid="tab-cumulative">
                    <Trophy className="h-4 w-4 mr-2" />
                    Season Total
                  </TabsTrigger>
                  <TabsTrigger value="monthly" data-testid="tab-monthly">
                    <Calendar className="h-4 w-4 mr-2" />
                    Monthly
                  </TabsTrigger>
                </TabsList>
                
                {activeTab === 'monthly' && (
                  <div className="flex items-center gap-2 justify-start sm:justify-end">
                    <span className="text-sm text-gray-600">Month:</span>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-48" data-testid="select-month">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <TabsContent value="cumulative">
                <div className="text-right mb-4">
                  <div className="text-xs text-gray-600">
                    Cumulative season standings
                  </div>
                  <div className="text-xs text-gray-500">Ends Mar 31, 2026</div>
                </div>
                {renderLeaderboardContent(cumulativeLeaderboard, totalRounds, avgOverParAll)}
              </TabsContent>

              <TabsContent value="monthly">
                <div className="text-right mb-4">
                  <div className="text-xs text-gray-600">
                    {getCurrentMonthName()} leaderboard
                  </div>
                  <div className="text-xs text-gray-500">Monthly standings</div>
                </div>
                {renderLeaderboardContent(monthlyLeaderboard, totalRounds, avgOverParAll)}
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}