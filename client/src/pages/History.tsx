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
  courseId: string;
  playedOn: string;
  rawScores: number[];
  cappedScores: number[];
  grossCapped: number;
  courseHandicap: number;
  net: number;
  overPar: number;
  source?: string;
  status?: string;
  createdAt?: string;
  courseName: string;
  course?: {
    name: string;
    tees: string;
    slope?: number;
  };
  slopeAdjustedCourseHandicap?: number;
  slopeAdjustedDTH?: number;
  handicapIndex?: number;
  normalizedOverPar?: number;
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
  }).sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime()) || [];

  // Get recent rounds (last 30 days)
  const recentRounds = rounds?.filter(round => {
    const roundDate = new Date(round.playedOn);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return roundDate >= thirtyDaysAgo;
  }).sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime()) || [];

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

  const RoundCard = ({ round }: { round: Round }) => {
    const correctPars = [4, 3, 4, 4, 4, 3, 5, 3, 4, 3, 4, 3, 3, 3, 4, 3, 5, 3];
    const pars = correctPars;

    return (
      <Card className="hover:shadow-md transition-shadow" data-testid={`round-card-${round.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900" data-testid={`text-course-name-${round.id}`}>
                {round.courseName}
              </h3>
              <p className="text-sm text-gray-600" data-testid={`text-played-date-${round.id}`}>
                {format(new Date(round.playedOn), 'MMMM d, yyyy')}
              </p>
              {round.course?.slope && (
                <p className="text-xs text-gray-500">
                  Slope: {round.course.slope}
                  {round.slopeAdjustedCourseHandicap !== undefined && round.slopeAdjustedCourseHandicap !== round.courseHandicap && (
                    <> | Course Hcp: {round.slopeAdjustedCourseHandicap}</>
                  )}
                </p>
              )}
            </div>
            <Badge variant="outline">Blue Tees</Badge>
          </div>

          {/* Full Scorecard Display */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-3 text-center">Full Scorecard:</div>
            
            {/* Front 9 */}
            <div className="grid gap-0.5 text-center text-xs font-mono mb-1" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="text-2xs text-gray-600 py-1">Hole</div>
              {Array.from({length: 9}, (_, i) => (
                <div key={i} className="text-2xs text-gray-600 py-1">{i + 1}</div>
              ))}
              <div className="text-2xs text-gray-600 py-1">OUT</div>
            </div>
            
            <div className="grid gap-0.5 text-center text-xs font-mono mb-0.5" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="bg-gray-100 rounded px-0.5 py-1 border text-2xs text-gray-600">Par</div>
              {pars.slice(0, 9).map((par, index) => (
                <div key={index} className="bg-gray-100 rounded px-0.5 py-1 border">
                  <div className="font-medium text-xs">{par}</div>
                </div>
              ))}
              <div className="bg-gray-100 rounded px-0.5 py-1 border font-medium">
                <div className="font-medium text-xs">{pars.slice(0, 9).reduce((sum, par) => sum + par, 0)}</div>
              </div>
            </div>
            
            <div className="grid gap-0.5 text-center text-xs font-mono mb-2" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="bg-gray-50 rounded px-0.5 py-1 border text-2xs text-gray-600">Score</div>
              {round.cappedScores?.slice(0, 9).map((score, index) => {
                const par = pars[index];
                const isOver = score > par;
                const isUnder = score < par;
                const isOneOver = score === par + 1;
                const isPar = score === par;
                return (
                  <div key={index} className={`rounded px-0.5 py-0.5 border ${
                    isOneOver ? 'bg-white text-blue-600' : isOver ? 'bg-red-50 text-red-700' : isUnder ? 'bg-green-100 text-green-800' : 'bg-white'
                  }`}>
                    {isPar ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-gray-400 font-bold text-xs leading-none mx-auto -translate-y-0.5">
                        {score}
                      </span>
                    ) : (
                      <div className="font-bold text-xs">{score}</div>
                    )}
                  </div>
                );
              })}
              <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold">
                <div className="font-bold text-xs">{round.cappedScores?.slice(0, 9).reduce((sum, score) => sum + score, 0)}</div>
              </div>
            </div>

            {/* Back 9 */}
            <div className="grid gap-0.5 text-center text-xs font-mono mb-1" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="text-2xs text-gray-600 py-1">Hole</div>
              {Array.from({length: 9}, (_, i) => (
                <div key={i + 9} className="text-2xs text-gray-600 py-1">{i + 10}</div>
              ))}
              <div className="text-2xs text-gray-600 py-1">IN</div>
            </div>
            
            <div className="grid gap-0.5 text-center text-xs font-mono mb-0.5" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="bg-gray-100 rounded px-0.5 py-1 border text-2xs text-gray-600">Par</div>
              {pars.slice(9, 18).map((par, index) => (
                <div key={index + 9} className="bg-gray-100 rounded px-0.5 py-1 border">
                  <div className="font-medium text-xs">{par}</div>
                </div>
              ))}
              <div className="bg-gray-100 rounded px-0.5 py-1 border font-medium">
                <div className="font-medium text-xs">{pars.slice(9, 18).reduce((sum, par) => sum + par, 0)}</div>
              </div>
            </div>
            
            <div className="grid gap-0.5 text-center text-xs font-mono mb-4" style={{ gridTemplateColumns: '3rem repeat(9, 1.5rem) 2.5rem' }}>
              <div className="bg-gray-50 rounded px-0.5 py-1 border text-2xs text-gray-600">Score</div>
              {round.cappedScores?.slice(9, 18).map((score, index) => {
                const par = pars[index + 9];
                const isOver = score > par;
                const isUnder = score < par;
                const isOneOver = score === par + 1;
                const isPar = score === par;
                return (
                  <div key={index + 9} className={`rounded px-0.5 py-0.5 border ${
                    isOneOver ? 'bg-white text-blue-600' : isOver ? 'bg-red-50 text-red-700' : isUnder ? 'bg-green-100 text-green-800' : 'bg-white'
                  }`}>
                    {isPar ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-gray-400 font-bold text-xs leading-none mx-auto -translate-y-0.5">
                        {score}
                      </span>
                    ) : (
                      <div className="font-bold text-xs">{score}</div>
                    )}
                  </div>
                );
              })}
              <div className="bg-golf-green text-white rounded px-0.5 py-1 border font-bold">
                <div className="font-bold text-xs">{round.cappedScores?.slice(9, 18).reduce((sum, score) => sum + score, 0)}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="font-bold text-xl">{round.grossCapped}</div>
              <div className="text-sm text-gray-600">Gross Score</div>
            </div>
            <div>
              <div className="font-bold text-xl text-golf-blue">{round.net}</div>
              <div className="text-sm text-gray-600">Net Score</div>
            </div>
            <div>
              <div className="font-bold text-xl text-golf-gold">+{parseFloat(round.overPar.toString()).toFixed(0)}</div>
              <div className="text-sm text-gray-600">Over Par</div>
            </div>
            <div>
              <div className="font-bold text-xl text-purple-600">
                {(() => {
                  const dth = round.slopeAdjustedDTH !== undefined 
                    ? round.slopeAdjustedDTH 
                    : parseFloat(round.overPar.toString()) - round.courseHandicap;
                  return (dth >= 0 ? '+' : '') + dth.toFixed(0);
                })()}
              </div>
              <div className="text-sm text-gray-600">DTH</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RoundListItem = ({ round }: { round: Round }) => (
    <div 
      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
      data-testid={`round-list-${round.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {getTrendIcon(parseFloat(round.overPar.toString()))}
          <Badge variant={getScoreBadgeVariant(parseFloat(round.overPar.toString()))} data-testid={`list-badge-${round.id}`}>
            {formatScore(parseFloat(round.overPar.toString()))}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900" data-testid={`list-course-${round.id}`}>
            {round.courseName}
          </h3>
          <p className="text-sm text-gray-600">
            {round.course?.tees || 'Blue Tees'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900" data-testid={`list-strokes-${round.id}`}>
          {round.grossCapped} strokes
        </p>
        <p className="text-sm text-gray-600" data-testid={`list-date-${round.id}`}>
          {format(new Date(round.playedOn), 'MMM d, yyyy')}
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