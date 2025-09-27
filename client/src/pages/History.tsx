import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, TrendingDown, Minus, Eye, BarChart3, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

interface Round {
  id: string;
  playerId: string;
  playerName: string;
  courseId: string;
  courseName: string;
  courseTees: string;
  playedAt: string;
  totalStrokes: number;
  overPar: number;
  grossScore: number;
  netScore: number | null;
  handicapAtTime: number | null;
  scores: number[];
  courseParTotal: number;
}

interface Player {
  id: string;
  name: string;
  email: string | null;
  handicap: number | null;
  isAdmin: boolean;
}

export default function History() {
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Organization-scoped data queries
  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`],
    enabled: !!currentOrganization?.id,
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id,
  });

  const { data: courses } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/courses`],
    enabled: !!currentOrganization?.id,
  });

  // Filter rounds based on selected criteria
  const filteredRounds = rounds?.filter(round => {
    if (selectedPlayer !== 'all' && round.playerId !== selectedPlayer) return false;
    if (selectedCourse !== 'all' && round.courseId !== selectedCourse) return false;
    return true;
  }).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()) || [];

  // Get recent rounds (last 30 days)
  const recentRounds = rounds?.filter(round => {
    const roundDate = new Date(round.playedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return roundDate >= thirtyDaysAgo;
  }).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()) || [];

  const getScoreBadgeVariant = (overPar: number) => {
    if (overPar < 0) return "default"; // Under par
    if (overPar === 0) return "secondary"; // Par
    if (overPar <= 5) return "outline"; // Slightly over
    return "destructive"; // Way over par
  };

  const getTrendIcon = (overPar: number) => {
    if (overPar < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (overPar === 0) return <Minus className="h-4 w-4 text-gray-500" />;
    return <TrendingUp className="h-4 w-4 text-red-500" />;
  };

  const formatScore = (overPar: number) => {
    if (overPar === 0) return "E";
    return overPar > 0 ? `+${overPar}` : `${overPar}`;
  };

  const RoundCard = ({ round }: { round: Round }) => (
    <Card className="hover:shadow-md transition-shadow" data-testid={`round-card-${round.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900" data-testid={`text-player-name-${round.id}`}>
                {round.playerName}
              </h3>
              {getTrendIcon(round.overPar)}
            </div>
            <p className="text-sm text-gray-600" data-testid={`text-course-name-${round.id}`}>
              {round.courseName} - {round.courseTees}
            </p>
            <p className="text-xs text-gray-500" data-testid={`text-played-date-${round.id}`}>
              {format(new Date(round.playedAt), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={getScoreBadgeVariant(round.overPar)} data-testid={`badge-score-${round.id}`}>
                {formatScore(round.overPar)}
              </Badge>
            </div>
            <p className="text-sm text-gray-600" data-testid={`text-total-strokes-${round.id}`}>
              {round.totalStrokes} strokes
            </p>
            {round.handicapAtTime && (
              <p className="text-xs text-gray-500" data-testid={`text-handicap-${round.id}`}>
                HCP: {round.handicapAtTime}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-9 gap-1 text-xs">
          {round.scores.map((score, index) => {
            const holeNumber = index + 1;
            const holePar = Math.floor(round.courseParTotal / 18); // Simplified par calculation
            const overUnder = score - holePar;
            return (
              <div
                key={holeNumber}
                className={`text-center p-1 rounded ${
                  overUnder < 0 ? 'bg-green-100 text-green-800' :
                  overUnder === 0 ? 'bg-gray-100 text-gray-800' :
                  overUnder === 1 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}
                data-testid={`hole-score-${round.id}-${holeNumber}`}
              >
                <div className="text-[10px] text-gray-500">{holeNumber}</div>
                <div className="font-semibold">{score}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const RoundListItem = ({ round }: { round: Round }) => (
    <div 
      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
      data-testid={`round-list-${round.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {getTrendIcon(round.overPar)}
          <Badge variant={getScoreBadgeVariant(round.overPar)} data-testid={`list-badge-${round.id}`}>
            {formatScore(round.overPar)}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900" data-testid={`list-player-${round.id}`}>
            {round.playerName}
          </h3>
          <p className="text-sm text-gray-600" data-testid={`list-course-${round.id}`}>
            {round.courseName} - {round.courseTees}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900" data-testid={`list-strokes-${round.id}`}>
          {round.totalStrokes} strokes
        </p>
        <p className="text-sm text-gray-600" data-testid={`list-date-${round.id}`}>
          {format(new Date(round.playedAt), 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  );

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
              <p className="text-gray-600">Please select an organization to view round history.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-history-title">
            {currentOrganization.name} Round History
          </h1>
          <p className="text-gray-600 mt-2" data-testid="text-history-description">
            Complete record of all rounds played in this organization
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-48" data-testid="select-player">
                <SelectValue placeholder="Filter by player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-players">All Players</SelectItem>
                {players?.map((player) => (
                  <SelectItem key={player.id} value={player.id} data-testid={`option-player-${player.id}`}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-48" data-testid="select-course">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-courses">All Courses</SelectItem>
                {courses?.map((course: any) => (
                  <SelectItem key={course.id} value={course.id} data-testid={`option-course-${course.id}`}>
                    {course.name} - {course.tees}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-list-view"
            >
              <HistoryIcon className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              data-testid="button-grid-view"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Cards
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" data-testid="tab-all-rounds">All Rounds</TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent-rounds">Recent (30 days)</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  All Rounds ({filteredRounds.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roundsLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredRounds.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-rounds">
                      No rounds found for the selected criteria.
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {filteredRounds.map((round) => 
                      viewMode === 'grid' ? (
                        <RoundCard key={round.id} round={round} />
                      ) : (
                        <RoundListItem key={round.id} round={round} />
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Rounds ({recentRounds.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roundsLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : recentRounds.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600" data-testid="text-no-recent-rounds">
                      No rounds played in the last 30 days.
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {recentRounds.map((round) => 
                      viewMode === 'grid' ? (
                        <RoundCard key={round.id} round={round} />
                      ) : (
                        <RoundListItem key={round.id} round={round} />
                      )
                    )}
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