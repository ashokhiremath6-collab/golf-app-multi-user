import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationPlayer } from "@/hooks/useOrganizationPlayer";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { History, Trophy, Calendar } from "lucide-react";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  position?: number;
  roundsPlayed?: number;
  roundsCount?: number;
  avgOverPar: number;
  avgDTH?: number;
  avgNet: number;
  handicap?: number | null;
  currentHandicap?: number | null;
  totalStrokes?: number;
  bestRound?: number | null;
  recentForm?: string;
}

export default function Leaderboard() {
  const { currentOrganization } = useOrganization();
  const { currentPlayer } = useOrganizationPlayer();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('season');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`],
    enabled: !!currentOrganization?.id,
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`],
    enabled: !!currentOrganization?.id && activeTab === 'monthly',
  });

  const { data: seasonSettings } = useQuery<any>({
    queryKey: [`/api/group/settings`],
    enabled: !!currentOrganization?.id,
  });

  const getSeasonLabel = () => {
    if (!seasonSettings?.startMonth) return "2024-25 Season";
    const startDate = new Date(seasonSettings.startMonth);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return `${startDate.getFullYear()}-${endDate.getFullYear().toString().slice(-2)} Season`;
  };

  const getSeasonEndDate = () => {
    if (!seasonSettings?.startMonth) return "Mar 31, 2026";
    const startDate = new Date(seasonSettings.startMonth);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setDate(endDate.getDate() - 1);
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMonthlyLeaderboard = () => {
    if (!rounds || !selectedMonth) return [];
    
    const [year, month] = selectedMonth.split('-');
    const monthlyRounds = rounds.filter((round: any) => {
      const roundDate = new Date(round.playedAt);
      return roundDate.getFullYear() === parseInt(year) && 
             roundDate.getMonth() === parseInt(month) - 1;
    });

    const playerStats = new Map();
    monthlyRounds.forEach((round: any) => {
      if (!playerStats.has(round.playerId)) {
        playerStats.set(round.playerId, {
          playerId: round.playerId,
          playerName: round.playerName,
          rounds: [],
          totalStrokes: 0,
          totalOverPar: 0,
          totalNet: 0,
          currentHandicap: round.currentHandicap,
        });
      }
      const stats = playerStats.get(round.playerId);
      stats.rounds.push(round);
      stats.totalStrokes += round.totalStrokes;
      const overParValue = typeof round.overPar === 'string' ? parseFloat(round.overPar) : round.overPar;
      const netValue = typeof round.net === 'string' ? parseFloat(round.net) : round.net;
      stats.totalOverPar += isNaN(overParValue) ? 0 : overParValue;
      stats.totalNet += isNaN(netValue) ? 0 : netValue;
    });

    return Array.from(playerStats.values())
      .map((stats: any) => ({
        playerId: stats.playerId,
        playerName: stats.playerName,
        roundsCount: stats.rounds.length,
        avgOverPar: stats.totalOverPar / stats.rounds.length,
        avgNet: stats.totalNet / stats.rounds.length,
        currentHandicap: stats.currentHandicap,
        bestRound: Math.min(...stats.rounds.map((r: any) => r.totalStrokes)),
      }))
      .sort((a, b) => a.avgOverPar - b.avgOverPar);
  };

  const formatDTH = (dth: number | null | undefined) => {
    if (dth == null) return "N/A";
    const numDTH = typeof dth === 'string' ? parseFloat(dth) : dth;
    if (isNaN(numDTH)) return "N/A";
    if (numDTH === 0) return "E";
    return numDTH > 0 ? `+${numDTH.toFixed(1)}` : numDTH.toFixed(1);
  };

  const formatOverPar = (overPar: number | null | undefined) => {
    if (overPar == null) return "N/A";
    const numOverPar = typeof overPar === 'string' ? parseFloat(overPar) : overPar;
    if (isNaN(numOverPar)) return "N/A";
    if (numOverPar === 0) return "E";
    return numOverPar > 0 ? `+${numOverPar.toFixed(1)}` : numOverPar.toFixed(1);
  };

  const formatNet = (net: number | null | undefined) => {
    if (net == null) return "N/A";
    const numNet = typeof net === 'string' ? parseFloat(net) : net;
    if (isNaN(numNet)) return "N/A";
    return numNet.toFixed(1);
  };

  const getDTHColor = (dth: number | null | undefined) => {
    if (dth == null) return "text-gray-600";
    const numDTH = typeof dth === 'string' ? parseFloat(dth) : dth;
    if (isNaN(numDTH)) return "text-gray-600";
    if (numDTH < 0) return "text-green-600 font-semibold";
    if (numDTH > 0) return "text-orange-600 font-semibold";
    return "text-gray-600";
  };

  const calculateSeasonStats = () => {
    if (!leaderboard || leaderboard.length === 0) {
      return {
        totalRounds: 0,
        avgNet: 0,
        avgOver: 0,
        avgDTH: 0,
      };
    }

    const totalRounds = leaderboard.reduce((sum, entry: any) => sum + (entry.roundsCount || entry.roundsPlayed || 0), 0);
    const totalNet = leaderboard.reduce((sum, entry: any) => {
      const rounds = entry.roundsCount || entry.roundsPlayed || 0;
      const net = typeof entry.avgNet === 'string' ? parseFloat(entry.avgNet) : entry.avgNet;
      return sum + (isNaN(net) ? 0 : net * rounds);
    }, 0);
    const totalOver = leaderboard.reduce((sum, entry: any) => {
      const rounds = entry.roundsCount || entry.roundsPlayed || 0;
      const over = typeof entry.avgOverPar === 'string' ? parseFloat(entry.avgOverPar) : entry.avgOverPar;
      return sum + (isNaN(over) ? 0 : over * rounds);
    }, 0);
    const totalDTH = leaderboard.reduce((sum, entry: any) => {
      const rounds = entry.roundsCount || entry.roundsPlayed || 0;
      const dth = typeof entry.avgDTH === 'string' ? parseFloat(entry.avgDTH) : entry.avgDTH;
      return sum + (isNaN(dth || 0) ? 0 : (dth || 0) * rounds);
    }, 0);

    return {
      totalRounds,
      avgNet: totalRounds > 0 ? totalNet / totalRounds : 0,
      avgOver: totalRounds > 0 ? totalOver / totalRounds : 0,
      avgDTH: totalRounds > 0 ? totalDTH / totalRounds : 0,
    };
  };

  const calculateMonthlyStats = (data: any[]) => {
    if (!data || data.length === 0) {
      return {
        totalRounds: 0,
        avgNet: 0,
        avgOver: 0,
      };
    }

    const totalRounds = data.reduce((sum, entry: any) => sum + (entry.roundsCount || 0), 0);
    const totalNet = data.reduce((sum, entry: any) => {
      const rounds = entry.roundsCount || 0;
      const net = typeof entry.avgNet === 'string' ? parseFloat(entry.avgNet) : entry.avgNet;
      return sum + (isNaN(net) ? 0 : net * rounds);
    }, 0);
    const totalOver = data.reduce((sum, entry: any) => {
      const rounds = entry.roundsCount || 0;
      const over = typeof entry.avgOverPar === 'string' ? parseFloat(entry.avgOverPar) : entry.avgOverPar;
      return sum + (isNaN(over) ? 0 : over * rounds);
    }, 0);

    return {
      totalRounds,
      avgNet: totalRounds > 0 ? totalNet / totalRounds : 0,
      avgOver: totalRounds > 0 ? totalOver / totalRounds : 0,
    };
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
            <p className="text-gray-600">Please select an organization to view the leaderboard.</p>
          </div>
        </Card>
      </div>
    );
  }

  const displayData = activeTab === 'monthly' ? getMonthlyLeaderboard() : leaderboard || [];
  const isLoading = leaderboardLoading;
  const seasonStats = calculateSeasonStats();
  const monthlyData = getMonthlyLeaderboard();
  const monthlyStats = calculateMonthlyStats(monthlyData);

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-leaderboard-title">
              Leaderboard
            </h1>
            <p className="text-xs text-gray-600 mt-0.5" data-testid="text-season-label">
              {getSeasonLabel()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/${currentOrganization.slug}/history`)}
            className="gap-1 text-xs"
            data-testid="button-view-history"
          >
            <History className="h-3 w-3" />
            History
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="season" data-testid="tab-season" className="gap-2">
              <Trophy className="h-4 w-4" />
              Season Total
            </TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly" className="gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          {/* Season Total Tab */}
          <TabsContent value="season" className="space-y-3 mt-3">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2">
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-gray-900" data-testid="stat-total-rounds">
                  {seasonStats.totalRounds}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Total Rounds</div>
              </Card>
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-blue-600" data-testid="stat-avg-net">
                  {seasonStats.avgNet.toFixed(1)}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Avg Net</div>
              </Card>
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-yellow-600" data-testid="stat-avg-over">
                  {formatOverPar(seasonStats.avgOver)}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Avg Over</div>
              </Card>
              <Card className="p-2 text-center">
                <div className={`text-lg font-bold ${getDTHColor(seasonStats.avgDTH)}`} data-testid="stat-avg-dth">
                  {formatDTH(seasonStats.avgDTH)}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Avg DTH</div>
              </Card>
            </div>

            {/* Season End Date */}
            <div className="text-right text-xs text-gray-600" data-testid="text-season-end">
              Cumulative season standings<br />Ends {getSeasonEndDate()}
            </div>

            {/* Leaderboard Table */}
            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="p-8">
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : displayData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600" data-testid="text-no-data">No rounds recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Rank</th>
                        <th className="pl-1 pr-0 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Player</th>
                        <th className="pl-0 pr-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Rounds</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Avg Net</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Avg DTH</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">HCP</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayData.map((entry: any, index) => (
                        <tr key={entry.playerId} className="hover:bg-gray-50" data-testid={`leaderboard-row-${entry.playerId}`}>
                          <td className="px-1 py-2 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900" data-testid={`rank-${index + 1}`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="pl-1 pr-0 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-900" data-testid={`player-name-${entry.playerId}`}>
                                {entry.playerName}
                              </span>
                              {currentPlayer?.id === entry.playerId && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-tight" data-testid="badge-you">
                                  You
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="pl-0 pr-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-900" data-testid={`rounds-${entry.playerId}`}>
                              {entry.roundsCount || entry.roundsPlayed || 0}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs font-medium text-blue-600" data-testid={`avg-net-${entry.playerId}`}>
                              {formatNet(entry.avgNet)}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className={`text-xs ${getDTHColor(entry.avgDTH)}`} data-testid={`avg-dth-${entry.playerId}`}>
                              {formatDTH(entry.avgDTH)}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-900" data-testid={`hcp-${entry.playerId}`}>
                              {entry.currentHandicap ?? entry.handicap ?? '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-3 mt-3">
            {/* Month Selector */}
            <div className="flex items-center justify-between">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48 text-xs h-8" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    return (
                      <SelectItem key={value} value={value} data-testid={`option-month-${value}`}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-gray-900" data-testid="stat-monthly-rounds">
                  {monthlyStats.totalRounds}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Total Rounds</div>
              </Card>
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-blue-600" data-testid="stat-monthly-net">
                  {monthlyStats.avgNet.toFixed(1)}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Avg Net</div>
              </Card>
              <Card className="p-2 text-center">
                <div className="text-lg font-bold text-yellow-600" data-testid="stat-monthly-over">
                  {formatOverPar(monthlyStats.avgOver)}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">Avg Over</div>
              </Card>
            </div>

            {/* Monthly Leaderboard Table */}
            <Card className="overflow-hidden">
              {roundsLoading ? (
                <div className="p-8">
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600" data-testid="text-no-monthly-data">
                    No rounds recorded for this month.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-1 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Rank</th>
                        <th className="pl-1 pr-0 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Player</th>
                        <th className="pl-0 pr-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Rounds</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Avg Net</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Avg Over</th>
                        <th className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">HCP</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.map((entry, index) => (
                        <tr key={entry.playerId} className="hover:bg-gray-50" data-testid={`monthly-row-${entry.playerId}`}>
                          <td className="px-1 py-2 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900" data-testid={`monthly-rank-${index + 1}`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="pl-1 pr-0 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-900" data-testid={`monthly-player-${entry.playerId}`}>
                                {entry.playerName}
                              </span>
                              {currentPlayer?.id === entry.playerId && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-tight" data-testid="badge-monthly-you">
                                  You
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="pl-0 pr-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-900" data-testid={`monthly-rounds-${entry.playerId}`}>
                              {entry.roundsCount || 0}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs font-medium text-blue-600" data-testid={`monthly-net-${entry.playerId}`}>
                              {formatNet(entry.avgNet)}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-900" data-testid={`monthly-over-${entry.playerId}`}>
                              {formatOverPar(entry.avgOverPar)}
                            </div>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-900" data-testid={`monthly-hcp-${entry.playerId}`}>
                              {entry.currentHandicap ?? '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
