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

  // Ultra-compact scorecard with paired holes (1/10, 2/11, etc.)
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

    return (
      <div className="w-full overflow-hidden">
        {/* Single ultra-compact table with all 18 holes */}
        <table className="table-fixed w-full border-collapse text-[10px] sm:text-[11px] tabular-nums tracking-tight">
          <thead>
            <tr className="bg-gray-50">
              {/* 9 paired hole columns */}
              {Array.from({length: 9}, (_, i) => (
                <th key={i} className="border border-gray-300 px-0.5 py-0.5 text-center font-medium text-gray-700" data-testid={`holes-${i+1}-${i+10}`}>
                  <div className="leading-none">{i+1}/{i+10}</div>
                </th>
              ))}
              {/* Totals column */}
              <th className="border-2 border-gray-400 px-0.5 py-0.5 text-center font-medium text-gray-700 w-12">TOT</th>
            </tr>
          </thead>
          <tbody>
            {/* Single row with paired data */}
            <tr>
              {/* 9 paired hole columns - each shows 2x2 grid */}
              {Array.from({length: 9}, (_, i) => {
                const frontPar = pars[i];
                const backPar = pars[i + 9];
                const frontScore = round.cappedScores[i];
                const backScore = round.cappedScores[i + 9];
                const frontOver = frontScore > frontPar;
                const frontUnder = frontScore < frontPar;
                const backOver = backScore > backPar;
                const backUnder = backScore < backPar;
                
                return (
                  <td key={i} className="border border-gray-300 p-0" data-testid={`paired-holes-${i+1}-${i+10}`}>
                    <div className="grid grid-cols-2 grid-rows-2 h-8 w-full">
                      {/* Top-left: Front hole par */}
                      <div className="bg-gray-100 border-r border-b border-gray-200 flex items-center justify-center text-gray-700 leading-none">
                        {frontPar}
                      </div>
                      {/* Top-right: Back hole par */}
                      <div className="bg-gray-100 border-b border-gray-200 flex items-center justify-center text-gray-700 leading-none">
                        {backPar}
                      </div>
                      {/* Bottom-left: Front hole score */}
                      <div className={`border-r border-gray-200 flex items-center justify-center leading-none ${
                        frontOver ? 'text-rose-700 font-medium' : frontUnder ? 'text-emerald-700 font-medium' : 'text-gray-900'
                      }`} data-testid={`hole-${i+1}-score`}>
                        {frontScore}
                      </div>
                      {/* Bottom-right: Back hole score */}
                      <div className={`flex items-center justify-center leading-none ${
                        backOver ? 'text-rose-700 font-medium' : backUnder ? 'text-emerald-700 font-medium' : 'text-gray-900'
                      }`} data-testid={`hole-${i+10}-score`}>
                        {backScore}
                      </div>
                    </div>
                  </td>
                );
              })}
              
              {/* Totals column */}
              <td className="border-2 border-gray-400 p-0 bg-gray-50" data-testid="totals">
                <div className="grid grid-cols-3 grid-rows-2 h-8 w-full text-[9px]">
                  {/* Top row: Par totals */}
                  <div className="border-r border-b border-gray-300 flex flex-col items-center justify-center leading-none">
                    <div className="text-gray-600">OUT</div>
                    <div className="font-medium">{pars.slice(0, 9).reduce((sum: number, par: number) => sum + par, 0)}</div>
                  </div>
                  <div className="border-r border-b border-gray-300 flex flex-col items-center justify-center leading-none">
                    <div className="text-gray-600">IN</div>
                    <div className="font-medium">{pars.slice(9, 18).reduce((sum: number, par: number) => sum + par, 0)}</div>
                  </div>
                  <div className="border-b border-gray-300 flex flex-col items-center justify-center leading-none">
                    <div className="text-gray-600">TOT</div>
                    <div className="font-semibold">{pars.reduce((sum: number, par: number) => sum + par, 0)}</div>
                  </div>
                  {/* Bottom row: Score totals */}
                  <div className="border-r border-gray-300 flex flex-col items-center justify-center leading-none" data-testid="front-nine-total">
                    <div className="text-gray-600">OUT</div>
                    <div className="font-medium">{round.cappedScores.slice(0, 9).reduce((sum: number, score: number) => sum + score, 0)}</div>
                  </div>
                  <div className="border-r border-gray-300 flex flex-col items-center justify-center leading-none" data-testid="back-nine-total">
                    <div className="text-gray-600">IN</div>
                    <div className="font-medium">{round.cappedScores.slice(9, 18).reduce((sum: number, score: number) => sum + score, 0)}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center leading-none" data-testid="total-score">
                    <div className="text-gray-600">TOT</div>
                    <div className="font-semibold">{round.cappedScores.reduce((sum: number, score: number) => sum + score, 0)}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
