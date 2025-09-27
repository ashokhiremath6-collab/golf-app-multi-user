import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

interface HandicapSnapshot {
  id: string;
  playerId: string;
  playerName: string;
  handicap: number;
  change: number | null;
  updatedAt: string;
  monthYear: string;
  effectiveDate: string;
  roundsUsed: number;
  avgOverPar: number;
}

interface Player {
  id: string;
  name: string;
  email: string | null;
  handicap: number | null;
  isAdmin: boolean;
}

export default function Handicaps() {
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('current');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Organization-scoped data queries
  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id,
  });

  const { data: handicapSnapshots, isLoading: snapshotsLoading } = useQuery<HandicapSnapshot[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps/snapshots`],
    enabled: !!currentOrganization?.id,
  });

  const { data: currentHandicaps, isLoading: currentLoading } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/handicaps/current`],
    enabled: !!currentOrganization?.id,
  });

  // Get current handicaps with trend analysis
  const getCurrentHandicaps = () => {
    if (!players || !handicapSnapshots) return [];

    return players.map(player => {
      const playerSnapshots = handicapSnapshots
        .filter(snapshot => snapshot.playerId === player.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const current = playerSnapshots[0];
      const previous = playerSnapshots[1];
      
      const change = current && previous ? current.handicap - previous.handicap : null;
      const trend = change === null ? 'stable' : change < 0 ? 'improving' : change > 0 ? 'worsening' : 'stable';

      return {
        playerId: player.id,
        playerName: player.name,
        currentHandicap: player.handicap || 0,
        previousHandicap: previous?.handicap || null,
        change,
        trend,
        lastUpdated: current?.updatedAt || null,
        roundsPlayed: current?.roundsUsed || 0,
      };
    }).sort((a, b) => a.currentHandicap - b.currentHandicap);
  };

  // Get historical handicaps for selected month
  const getHistoricalHandicaps = () => {
    if (!handicapSnapshots || !selectedMonth) return [];
    
    const [year, month] = selectedMonth.split('-');
    return handicapSnapshots
      .filter(snapshot => {
        const snapshotDate = new Date(snapshot.updatedAt);
        return snapshotDate.getFullYear() === parseInt(year) && 
               snapshotDate.getMonth() === parseInt(month) - 1;
      })
      .sort((a, b) => a.handicap - b.handicap);
  };

  const getTrendIcon = (trend: string, change: number | null) => {
    if (change === null || change === 0) return <Minus className="h-4 w-4 text-gray-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <TrendingUp className="h-4 w-4 text-red-500" />;
  };

  const getTrendBadge = (trend: string, change: number | null) => {
    if (change === null) return <Badge variant="secondary">New</Badge>;
    if (change === 0) return <Badge variant="secondary">Stable</Badge>;
    if (change < 0) return <Badge variant="default" className="bg-green-600">Improved</Badge>;
    return <Badge variant="destructive">Increased</Badge>;
  };

  const formatHandicapChange = (change: number | null) => {
    if (change === null) return "New";
    if (change === 0) return "No change";
    return change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`;
  };

  const getCurrentMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
              <p className="text-gray-600">Please select an organization to view handicaps.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentData = getCurrentHandicaps();
  const historicalData = getHistoricalHandicaps();
  const filteredCurrent = selectedPlayer !== 'all' 
    ? currentData.filter(item => item.playerId === selectedPlayer)
    : currentData;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-handicaps-title">
            {currentOrganization.name} Handicaps
          </h1>
          <p className="text-gray-600 mt-2" data-testid="text-handicaps-description">
            Current handicaps and historical trends for all players
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-48" data-testid="select-player-handicaps">
              <SelectValue placeholder="Filter by player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-all-players-handicaps">All Players</SelectItem>
              {players?.map((player) => (
                <SelectItem key={player.id} value={player.id} data-testid={`option-player-handicap-${player.id}`}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" data-testid="tab-current-handicaps">Current Handicaps</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-handicap-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Current Season Handicaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playersLoading || snapshotsLoading ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredCurrent.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-handicaps">
                      No handicap data available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCurrent.map((item, index) => (
                      <div
                        key={item.playerId}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                        data-testid={`handicap-current-${item.playerId}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[3rem]">
                            <div className="text-2xl font-bold text-gray-900" data-testid={`text-rank-${item.playerId}`}>
                              {index + 1}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-handicap-player-${item.playerId}`}>
                              {item.playerName}
                            </h3>
                            <p className="text-sm text-gray-600" data-testid={`text-rounds-used-${item.playerId}`}>
                              {item.roundsPlayed} rounds used
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-gray-900" data-testid={`text-current-handicap-${item.playerId}`}>
                              {item.currentHandicap.toFixed(1)}
                            </span>
                            {getTrendIcon(item.trend, item.change)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendBadge(item.trend, item.change)}
                            {item.change !== null && (
                              <span className="text-xs text-gray-600" data-testid={`text-handicap-change-${item.playerId}`}>
                                {formatHandicapChange(item.change)}
                              </span>
                            )}
                          </div>
                          {item.lastUpdated && (
                            <p className="text-xs text-gray-500 mt-1" data-testid={`text-last-updated-${item.playerId}`}>
                              Updated {format(new Date(item.lastUpdated), 'MMM d')}
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

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Handicap History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-48" data-testid="select-handicap-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => {
                        const date = new Date();
                        date.setMonth(date.getMonth() - i);
                        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        return (
                          <SelectItem key={value} value={value} data-testid={`option-handicap-month-${value}`}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4" data-testid="text-historical-title">
                  {getCurrentMonthName()} Handicap Updates
                </h3>
                {snapshotsLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : historicalData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-historical-data">
                      No handicap updates for {getCurrentMonthName()}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historicalData.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                        data-testid={`handicap-history-${snapshot.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`text-history-player-${snapshot.id}`}>
                              {snapshot.playerName}
                            </h3>
                            <p className="text-sm text-gray-600" data-testid={`text-history-date-${snapshot.id}`}>
                              {format(new Date(snapshot.updatedAt), 'MMMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900" data-testid={`text-history-handicap-${snapshot.id}`}>
                            {snapshot.handicap.toFixed(1)}
                          </div>
                          <div className="flex items-center gap-2">
                            {snapshot.change !== null && (
                              <>
                                {getTrendIcon('', snapshot.change)}
                                <span className="text-xs text-gray-600" data-testid={`text-history-change-${snapshot.id}`}>
                                  {formatHandicapChange(snapshot.change)}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-500" data-testid={`text-history-rounds-${snapshot.id}`}>
                            {snapshot.roundsUsed} rounds used
                          </p>
                        </div>
                      </div>
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