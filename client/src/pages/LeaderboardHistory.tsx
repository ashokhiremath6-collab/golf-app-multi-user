import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, Medal, Award, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function LeaderboardHistory() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

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

  const { data: leaderboardHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/leaderboard/history"],
    retry: false,
  });

  const { data: monthlySnapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ["/api/leaderboard/history", selectedMonth],
    enabled: !!selectedMonth,
    retry: false,
  });

  const { data: monthlyWinners } = useQuery({
    queryKey: ["/api/monthly-winners"],
    retry: false,
  });

  if (isLoading || historyLoading) {
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

  const getWinnerForMonth = (month: string) => {
    return Array.isArray(monthlyWinners) ? monthlyWinners.find((w: any) => w.month === month) : null;
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-orange-500" />;
    return <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-3">
        <div className="mb-4">
          <Link href="/leaderboard">
            <Button variant="outline" size="sm" data-testid="button-back-to-leaderboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly History List */}
          <Card data-testid="card-monthly-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Leaderboard History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(leaderboardHistory) && leaderboardHistory.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardHistory.map((history: any) => {
                    const winner = getWinnerForMonth(history.month);
                    return (
                      <div 
                        key={history.month}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedMonth === history.month 
                            ? 'border-golf-green bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedMonth(history.month)}
                        data-testid={`history-month-${history.month}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {getMonthName(history.month)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {history.playerCount} players • {parseFloat(history.avgRoundsPerPlayer || 0).toFixed(1)} avg rounds
                            </div>
                          </div>
                          {winner && (
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                                <Trophy className="h-3 w-3" />
                                {winner.winnerName}
                              </div>
                              {winner.runnerUpName && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Medal className="h-3 w-3" />
                                  {winner.runnerUpName}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {winner && (
                          <Badge variant="secondary" className="mt-2" data-testid={`badge-announced-${history.month}`}>
                            Winner Announced
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No monthly leaderboard history available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Month Details */}
          <Card data-testid="card-monthly-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {selectedMonth ? `${getMonthName(selectedMonth)} Leaderboard` : 'Select a Month'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMonth ? (
                <>
                  {snapshotLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ) : Array.isArray(monthlySnapshot) && monthlySnapshot.length > 0 ? (
                    <>
                      {/* Winner Announcement */}
                      {(() => {
                        const winner = getWinnerForMonth(selectedMonth);
                        if (winner) {
                          return (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <span className="font-semibold text-yellow-800">Monthly Champions</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium">{winner.winnerName}</span>
                                  <Badge variant="outline">{parseFloat(winner.winnerScore).toFixed(1)} avg</Badge>
                                </div>
                                {winner.runnerUpName && (
                                  <div className="flex items-center gap-2">
                                    <Medal className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{winner.runnerUpName}</span>
                                    <Badge variant="outline">{parseFloat(winner.runnerUpScore).toFixed(1)} avg</Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Leaderboard Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Rank
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Player
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                Rounds
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                Avg Net
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {monthlySnapshot.map((player: any) => (
                              <tr 
                                key={player.id}
                                className={`${currentPlayer && player.playerId === currentPlayer.id ? 'bg-green-50' : ''}`}
                                data-testid={`snapshot-row-${player.playerId}`}
                              >
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    {getRankIcon(player.rank)}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-sm">
                                    {player.playerName}
                                    {currentPlayer && player.playerId === currentPlayer.id && (
                                      <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center text-sm">
                                  {player.roundsCount}
                                </td>
                                <td className="px-3 py-3 text-center text-sm font-semibold">
                                  {parseFloat(player.avgNet).toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No data available for {getMonthName(selectedMonth)}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a month from the history to view detailed standings
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}