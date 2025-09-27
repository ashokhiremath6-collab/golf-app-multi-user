import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Calendar } from "lucide-react";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  position: number;
  roundsPlayed: number;
  avgOverPar: number;
  handicap: number | null;
  totalStrokes: number;
  bestRound: number | null;
  recentForm: string;
}

interface MonthlyWinner {
  playerId: string;
  playerName: string;
  monthYear: string;
  avgOverPar: number;
  roundsPlayed: number;
}

export default function Leaderboard() {
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('cumulative');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Organization-scoped leaderboard data
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/leaderboard`],
    enabled: !!currentOrganization?.id,
  });

  // Organization-scoped monthly winners
  const { data: monthlyWinners, isLoading: winnersLoading } = useQuery<MonthlyWinner[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/monthly-winners`],
    enabled: !!currentOrganization?.id,
  });

  // Organization-scoped rounds for monthly filtering
  const { data: rounds } = useQuery({
    queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`],
    enabled: !!currentOrganization?.id && activeTab === 'monthly',
  });

  const getCurrentMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthlyLeaderboard = () => {
    if (!rounds || !selectedMonth) return [];
    
    // Filter rounds by selected month and calculate monthly stats
    const [year, month] = selectedMonth.split('-');
    const monthlyRounds = rounds.filter((round: any) => {
      const roundDate = new Date(round.playedAt);
      return roundDate.getFullYear() === parseInt(year) && 
             roundDate.getMonth() === parseInt(month) - 1;
    });

    // Group by player and calculate monthly averages
    const playerStats = new Map();
    monthlyRounds.forEach((round: any) => {
      if (!playerStats.has(round.playerId)) {
        playerStats.set(round.playerId, {
          playerId: round.playerId,
          playerName: round.playerName,
          rounds: [],
          totalStrokes: 0,
          totalOverPar: 0,
        });
      }
      const stats = playerStats.get(round.playerId);
      stats.rounds.push(round);
      stats.totalStrokes += round.totalStrokes;
      stats.totalOverPar += round.overPar;
    });

    // Convert to leaderboard format and sort
    return Array.from(playerStats.values())
      .map((stats: any) => ({
        playerId: stats.playerId,
        playerName: stats.playerName,
        position: 0, // Will be set after sorting
        roundsPlayed: stats.rounds.length,
        avgOverPar: stats.totalOverPar / stats.rounds.length,
        handicap: null, // Would need current handicap data
        totalStrokes: stats.totalStrokes,
        bestRound: Math.min(...stats.rounds.map((r: any) => r.totalStrokes)),
        recentForm: "stable"
      }))
      .sort((a, b) => a.avgOverPar - b.avgOverPar)
      .map((entry, index) => ({ ...entry, position: index + 1 }));
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" data-testid="icon-trophy-first" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" data-testid="icon-medal-second" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" data-testid="icon-award-third" />;
      default: return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-gray-600" data-testid={`text-position-${position}`}>{position}</span>;
    }
  };

  const formatOverPar = (overPar: number) => {
    if (overPar === 0) return "E";
    return overPar > 0 ? `+${overPar.toFixed(1)}` : overPar.toFixed(1);
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
              <p className="text-gray-600">Please select an organization to view the leaderboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayData = activeTab === 'monthly' ? getMonthlyLeaderboard() : leaderboard || [];
  const isLoading = leaderboardLoading || (activeTab === 'monthly' && !rounds);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-leaderboard-title">
            {currentOrganization.name} Leaderboard
          </h1>
          <p className="text-gray-600 mt-2" data-testid="text-leaderboard-description">
            Current season standings and performance metrics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cumulative" data-testid="tab-cumulative">Season Total</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            <TabsTrigger value="winners" data-testid="tab-winners">Past Winners</TabsTrigger>
          </TabsList>

          <TabsContent value="cumulative" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Season Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : displayData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-data">No rounds recorded yet for this organization.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayData.map((entry) => (
                      <div
                        key={entry.playerId}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                        data-testid={`leaderboard-entry-${entry.playerId}`}
                      >
                        <div className="flex items-center gap-4">
                          {getPositionIcon(entry.position)}
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-player-name-${entry.playerId}`}>
                              {entry.playerName}
                            </h3>
                            <p className="text-sm text-gray-600" data-testid={`text-rounds-played-${entry.playerId}`}>
                              {entry.roundsPlayed} rounds played
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900" data-testid={`text-avg-over-par-${entry.playerId}`}>
                            {formatOverPar(entry.avgOverPar)}
                          </div>
                          {entry.handicap && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-handicap-${entry.playerId}`}>
                              HCP {entry.handicap}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Leaderboard
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-48" data-testid="select-month">
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
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4" data-testid="text-monthly-title">
                  {getCurrentMonthName()} Results
                </h3>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : displayData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-monthly-data">
                      No rounds recorded for {getCurrentMonthName()}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayData.map((entry) => (
                      <div
                        key={entry.playerId}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                        data-testid={`monthly-entry-${entry.playerId}`}
                      >
                        <div className="flex items-center gap-4">
                          {getPositionIcon(entry.position)}
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-monthly-player-${entry.playerId}`}>
                              {entry.playerName}
                            </h3>
                            <p className="text-sm text-gray-600" data-testid={`text-monthly-rounds-${entry.playerId}`}>
                              {entry.roundsPlayed} rounds this month
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900" data-testid={`text-monthly-avg-${entry.playerId}`}>
                            {formatOverPar(entry.avgOverPar)}
                          </div>
                          {entry.bestRound && (
                            <p className="text-xs text-gray-600" data-testid={`text-best-round-${entry.playerId}`}>
                              Best: {entry.bestRound}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="winners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Monthly Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                {winnersLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !monthlyWinners || monthlyWinners.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-winners">No monthly winners recorded yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {monthlyWinners.map((winner, index) => (
                      <Card key={`${winner.playerId}-${winner.monthYear}`} className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="h-6 w-6 text-yellow-600" />
                            <div>
                              <h4 className="font-bold text-gray-900" data-testid={`text-winner-name-${index}`}>
                                {winner.playerName}
                              </h4>
                              <p className="text-sm text-gray-600" data-testid={`text-winner-month-${index}`}>
                                {winner.monthYear}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-yellow-700" data-testid={`text-winner-score-${index}`}>
                              {formatOverPar(winner.avgOverPar)}
                            </p>
                            <p className="text-xs text-gray-600" data-testid={`text-winner-rounds-${index}`}>
                              {winner.roundsPlayed} rounds
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}