import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function History() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading, isPreviewMode } = useCurrentPlayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("self");
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");

  // Redirect to login if not authenticated (but not in preview mode)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPreviewMode) {
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
  }, [isAuthenticated, isLoading, isPreviewMode, toast]);

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  // Construct proper query parameters for rounds API
  const roundsPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  
  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds", { playerId: roundsPlayerId }],
    queryFn: ({ queryKey }) => {
      const [, params] = queryKey as [string, { playerId?: string }];
      const searchParams = new URLSearchParams();
      if (params.playerId) searchParams.set('playerId', params.playerId);
      return fetch(`/api/rounds?${searchParams.toString()}`, { credentials: 'include' }).then(res => res.json());
    },
    enabled: !!roundsPlayerId,
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

  const displayPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  const displayPlayer = selectedPlayerId === "self" ? currentPlayer : (players as any[])?.find((p: any) => p.id === selectedPlayerId);

  // Get rounds for the selected player and handle round selection
  const lastRound = rounds && (rounds as any[]).length > 0 ? (rounds as any[])[0] : null;
  
  // Reset selected round when player changes or set to last round by default
  useEffect(() => {
    if (rounds && (rounds as any[]).length > 0) {
      if (!selectedRoundId || !(rounds as any[]).find((r: any) => r.id === selectedRoundId)) {
        setSelectedRoundId((rounds as any[])[0].id); // Default to most recent round
      }
    }
  }, [rounds, selectedRoundId]);
  
  // Find the selected round
  const selectedRound = selectedRoundId && rounds ? (rounds as any[]).find((r: any) => r.id === selectedRoundId) : lastRound;
  
  const calculateSummary = () => {
    if (!rounds || (rounds as any[]).length === 0) {
      return { roundsPlayed: 0, avgGross: 0, avgNet: 0, avgOverPar: 0, avgDTH: 0 };
    }

    const roundsPlayed = (rounds as any[]).length;
    const avgGross = (rounds as any[]).reduce((sum: number, round: any) => sum + round.grossCapped, 0) / roundsPlayed;
    const avgNet = (rounds as any[]).reduce((sum: number, round: any) => sum + round.net, 0) / roundsPlayed;
    const avgOverPar = (rounds as any[]).reduce((sum: number, round: any) => sum + parseFloat(round.overPar), 0) / roundsPlayed;
    
    // Calculate DTH (Difference to Handicap) using slope-adjusted values when available
    const avgDTH = (rounds as any[]).reduce((sum: number, round: any) => {
      // Use slope-adjusted DTH if available, otherwise fall back to original calculation
      const dth = round.slopeAdjustedDTH !== undefined 
        ? round.slopeAdjustedDTH 
        : parseFloat(round.overPar) - round.courseHandicap;
      return sum + dth;
    }, 0) / roundsPlayed;

    return {
      roundsPlayed,
      avgGross: Math.round(avgGross),
      avgNet: Math.round(avgNet),
      avgOverPar: avgOverPar.toFixed(1),
      avgDTH: avgDTH.toFixed(1),
    };
  };

  const summary = calculateSummary();

  // Render clean scorecard component
  const renderScorecard = (round: any) => {
    if (!round.cappedScores || round.cappedScores.length !== 18) {
      return (
        <div className="text-sm text-gray-500 text-center py-4 border border-gray-200 rounded-lg">
          Scorecard data not available
        </div>
      );
    }

    const defaultPars = [4, 4, 3, 4, 5, 3, 4, 4, 3, 4, 4, 5, 3, 4, 4, 5, 3, 4];
    const pars = defaultPars;

    const ScoreCard = ({ holes, title, startIndex }: { holes: number[], title: string, startIndex: number }) => (
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden mb-3">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-800">{title}</h4>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-700 w-16">Hole</th>
                  {Array.from({length: 9}, (_, i) => (
                    <th key={i} className="border-b border-l border-gray-300 bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-700 min-w-[32px] tabular-nums">
                      {startIndex + i + 1}
                    </th>
                  ))}
                  <th className="border-b border-l-2 border-gray-400 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-700 w-16">
                    {title.includes('Front') ? 'OUT' : 'IN'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-800">Par</td>
                  {pars.slice(startIndex, startIndex + 9).map((par: number, index: number) => (
                    <td key={index} className="border-b border-l border-gray-300 bg-gray-100 px-2 py-2 text-center text-sm tabular-nums" data-testid={`hole-${startIndex + index + 1}-par`}>
                      {par}
                    </td>
                  ))}
                  <td className="border-b border-l-2 border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm font-medium tabular-nums" data-testid={`${title.includes('Front') ? 'front' : 'back'}-nine-par`}>
                    {pars.slice(startIndex, startIndex + 9).reduce((sum: number, par: number) => sum + par, 0)}
                  </td>
                </tr>
                <tr>
                  <td className="bg-white px-3 py-2 text-sm text-gray-800">Score</td>
                  {round.cappedScores.slice(startIndex, startIndex + 9).map((score: number, index: number) => {
                    const par = pars[startIndex + index];
                    const isOver = score > par;
                    const isUnder = score < par;
                    return (
                      <td key={index} className={`border-l border-gray-300 px-2 py-2 text-center text-sm tabular-nums ${
                        isOver ? 'text-rose-700 font-medium' : isUnder ? 'text-emerald-700 font-medium' : 'text-gray-900'
                      }`} data-testid={`hole-${startIndex + index + 1}-score`}>
                        {score}
                      </td>
                    );
                  })}
                  <td className="border-l-2 border-gray-400 px-3 py-2 text-center text-sm font-semibold tabular-nums bg-gray-50" data-testid={`${title.includes('Front') ? 'front' : 'back'}-nine-total`}>
                    {round.cappedScores.slice(startIndex, startIndex + 9).reduce((sum: number, score: number) => sum + score, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-0">
        <ScoreCard holes={Array.from({length: 9}, (_, i) => i + 1)} title="Front 9" startIndex={0} />
        <ScoreCard holes={Array.from({length: 9}, (_, i) => i + 10)} title="Back 9" startIndex={9} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center">
          <div className="max-w-7xl mx-auto">
            <span className="font-medium">Preview Mode:</span> View-only access - data modifications are disabled
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 py-3">
        <Card data-testid="card-history">
          <CardContent className="pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-history-title">
              Player History
            </h2>

            {/* Player Selection Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Player
              </label>
              <Select 
                value={selectedPlayerId} 
                onValueChange={setSelectedPlayerId}
                data-testid="select-player"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self" data-testid="select-player-self">
                    Your History
                  </SelectItem>
                  {(players as any[])?.filter((p: any) => p.id !== currentPlayer?.id).map((player: any) => (
                    <SelectItem 
                      key={player.id} 
                      value={player.id}
                      data-testid={`select-player-${player.id}`}
                    >
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Round Selection Dropdown */}
            {rounds && (rounds as any[]).length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Round
                </label>
                <Select 
                  value={selectedRoundId} 
                  onValueChange={setSelectedRoundId}
                  data-testid="select-round"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a round" />
                  </SelectTrigger>
                  <SelectContent>
                    {(rounds as any[]).map((round: any, index: number) => (
                      <SelectItem 
                        key={round.id} 
                        value={round.id}
                        data-testid={`select-round-${round.id}`}
                      >
                        {round.courseName || 'Unknown Course'} {round.course?.slope && `(Slope ${round.course.slope})`} - {new Date(round.playedOn).toLocaleDateString()} (Net {round.net})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Player's Last Round and Summary */}
            {roundsLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse border border-gray-200 rounded-lg p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : selectedRound ? (
              <div className="space-y-4">
                {/* Compact Player Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900" data-testid="text-selected-player-name">
                      {displayPlayer?.name || 'Unknown Player'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Handicap: <span className="font-medium">{displayPlayer?.currentHandicap || 0}</span>
                      {selectedRound.slopeAdjustedCourseHandicap !== undefined && selectedRound.slopeAdjustedCourseHandicap !== selectedRound.courseHandicap && (
                        <> | Course Hcp: <span className="font-medium">{selectedRound.slopeAdjustedCourseHandicap}</span></>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Selected Round</div>
                    <div className="font-medium text-sm">{selectedRound.courseName}</div>
                    {selectedRound.course?.slope && (
                      <div className="text-xs text-gray-500">Slope: {selectedRound.course.slope}</div>
                    )}
                    <div className="text-xs text-gray-500">{new Date(selectedRound.playedOn).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Compact Last Round & Summary Combined */}
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    {renderScorecard(selectedRound)}
                    
                    {/* Combined Stats - Last Round + Season Summary */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="font-bold text-base" data-testid="text-last-gross">
                            {selectedRound.grossCapped}
                          </div>
                          <div className="text-2xs text-gray-600">Round Gross</div>
                        </div>
                        <div>
                          <div className="font-bold text-base text-golf-blue" data-testid="text-last-net">
                            {selectedRound.net}
                          </div>
                          <div className="text-2xs text-gray-600">Round Net</div>
                        </div>
                        <div>
                          <div className="font-bold text-base text-golf-gold" data-testid="text-last-over-par">
                            +{parseFloat(selectedRound.overPar).toFixed(0)}
                          </div>
                          <div className="text-2xs text-gray-600">Round Over</div>
                        </div>
                        <div>
                          <div className="font-bold text-base text-purple-600" data-testid="text-last-dth">
                            {(() => {
                              const dth = selectedRound.slopeAdjustedDTH !== undefined 
                                ? selectedRound.slopeAdjustedDTH 
                                : parseFloat(selectedRound.overPar) - selectedRound.courseHandicap;
                              return (dth >= 0 ? '+' : '') + dth.toFixed(0);
                            })()} 
                          </div>
                          <div className="text-2xs text-gray-600">Round DTH</div>
                        </div>
                      </div>
                      
                      {/* Season Averages */}
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2 text-center">Season Averages</div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div>
                            <div className="text-lg font-black text-gray-900" data-testid="text-summary-rounds">
                              {summary.roundsPlayed}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Rounds</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-green" data-testid="text-summary-avg-gross">
                              {summary.avgGross}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Gross</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-blue" data-testid="text-summary-avg-net">
                              {summary.avgNet}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Net</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-golf-gold" data-testid="text-summary-avg-over-par">
                              +{summary.avgOverPar}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg Over</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-purple-600" data-testid="text-summary-avg-dth">
                              {Number(summary.avgDTH) >= 0 ? '+' : ''}{summary.avgDTH}
                            </div>
                            <div className="text-2xs font-semibold text-gray-700">Avg DTH</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8" data-testid="empty-state-rounds">
                <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rounds found</h3>
                <p className="text-gray-500">
                  {displayPlayer?.name || 'This player'} hasn't played any rounds yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
