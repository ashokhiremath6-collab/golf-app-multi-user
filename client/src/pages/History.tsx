import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationPlayer } from "@/hooks/useOrganizationPlayer";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Round {
  id: string;
  playerId: string;
  playerName: string;
  courseId: string;
  playedOn: string;
  playedAt: string;
  rawScores: number[];
  cappedScores: number[];
  grossCapped: number;
  courseHandicap: number;
  net: number;
  overPar: number;
  source?: string;
  courseName: string;
  course?: {
    name: string;
    tees: string;
    slope?: number;
  };
  currentHandicap?: number;
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
  const { currentPlayer } = useOrganizationPlayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/rounds`],
    enabled: !!currentOrganization?.id,
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id,
  });

  // Set default player to current user when data loads
  useEffect(() => {
    if (currentPlayer && !selectedPlayerId) {
      setSelectedPlayerId(currentPlayer.id);
    }
  }, [currentPlayer, selectedPlayerId]);

  // Filter rounds by selected player
  const playerRounds = useMemo(() => {
    if (!rounds || !selectedPlayerId) return [];
    return rounds
      .filter(round => round.playerId === selectedPlayerId)
      .sort((a, b) => new Date(b.playedOn || b.playedAt).getTime() - new Date(a.playedOn || a.playedAt).getTime());
  }, [rounds, selectedPlayerId]);

  // Set default round to most recent when player changes
  useEffect(() => {
    if (playerRounds.length > 0 && !selectedRoundId) {
      setSelectedRoundId(playerRounds[0].id);
    } else if (playerRounds.length > 0 && !playerRounds.find(r => r.id === selectedRoundId)) {
      setSelectedRoundId(playerRounds[0].id);
    }
  }, [playerRounds, selectedRoundId]);

  // Get selected round
  const selectedRound = playerRounds.find(r => r.id === selectedRoundId);

  // Fetch holes for the selected round's course
  const { data: holes } = useQuery<{ id: string; courseId: string; number: number; par: number; distance: number; }[]>({
    queryKey: ['/api/courses', selectedRound?.courseId, 'holes'],
    enabled: !!selectedRound?.courseId,
  });

  // Get selected player
  const selectedPlayer = players?.find(p => p.id === selectedPlayerId);

  // Calculate season averages for selected player
  const seasonAverages = useMemo(() => {
    if (!playerRounds || playerRounds.length === 0) {
      return {
        rounds: 0,
        avgGross: 0,
        avgNet: 0,
        avgOver: 0,
        avgDTH: 0,
      };
    }

    const totalGross = playerRounds.reduce((sum, r) => sum + r.grossCapped, 0);
    const totalNet = playerRounds.reduce((sum, r) => sum + r.net, 0);
    const totalOver = playerRounds.reduce((sum, r) => {
      const over = typeof r.overPar === 'string' ? parseFloat(r.overPar) : r.overPar;
      return sum + (isNaN(over) ? 0 : over);
    }, 0);
    const totalDTH = playerRounds.reduce((sum, r) => {
      const over = typeof r.overPar === 'string' ? parseFloat(r.overPar) : r.overPar;
      const dth = (isNaN(over) ? 0 : over) - r.courseHandicap;
      return sum + dth;
    }, 0);

    return {
      rounds: playerRounds.length,
      avgGross: totalGross / playerRounds.length,
      avgNet: totalNet / playerRounds.length,
      avgOver: totalOver / playerRounds.length,
      avgDTH: totalDTH / playerRounds.length,
    };
  }, [playerRounds]);

  const formatRoundOption = (round: Round) => {
    const courseName = round.courseName || round.course?.name || 'Unknown Course';
    const slope = round.course?.slope;
    const date = format(new Date(round.playedOn || round.playedAt), 'dd/MM/yyyy');
    const net = round.net;
    return `${courseName}${slope ? ` (Slope ${slope})` : ''} - ${date} (Net ${net})`;
  };

  const formatDTH = (dth: number) => {
    const rounded = Math.round(dth);
    if (rounded === 0) return "E";
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  };

  const formatOverPar = (overPar: number) => {
    const rounded = Math.round(overPar);
    if (rounded === 0) return "E";
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  };

  const getDTHColor = (dth: number) => {
    const rounded = Math.round(dth);
    if (rounded < 0) return "text-green-600";
    if (rounded > 0) return "text-orange-600";
    return "text-gray-600";
  };

  // Get par values from holes data, sorted by hole number
  const pars = useMemo(() => {
    if (!holes || holes.length !== 18) {
      // Fallback to default par values if holes data is not available
      return [5, 4, 4, 4, 3, 4, 3, 4, 4, 3, 4, 4, 3, 5, 3, 4, 4, 3];
    }
    const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
    return sortedHoles.map(hole => hole.par);
  }, [holes]);

  const parOut = pars.slice(0, 9).reduce((sum, p) => sum + p, 0);
  const parIn = pars.slice(9, 18).reduce((sum, p) => sum + p, 0);

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization Selected</h2>
            <p className="text-gray-600">Please select an organization to view history.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (roundsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const roundDTH = selectedRound 
    ? (typeof selectedRound.overPar === 'string' ? parseFloat(selectedRound.overPar) : selectedRound.overPar) - selectedRound.courseHandicap
    : 0;

  const scoreOut = selectedRound?.cappedScores?.slice(0, 9).reduce((sum, s) => sum + (s ?? 0), 0) || 0;
  const scoreIn = selectedRound?.cappedScores?.slice(9, 18).reduce((sum, s) => sum + (s ?? 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900" data-testid="text-history-title">
          Player History
        </h1>

        {/* Player Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Select Player</label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-full bg-white" data-testid="select-player">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {currentPlayer && (
                <SelectItem value={currentPlayer.id} data-testid="option-your-history">
                  Your History
                </SelectItem>
              )}
              {players?.filter(p => p.id !== currentPlayer?.id).map((player) => (
                <SelectItem key={player.id} value={player.id} data-testid={`option-player-${player.id}`}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Round Selection */}
        {selectedPlayerId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Round</label>
            <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
              <SelectTrigger className="w-full bg-white" data-testid="select-round">
                <SelectValue placeholder="Select a round" />
              </SelectTrigger>
              <SelectContent>
                {playerRounds.map((round) => (
                  <SelectItem key={round.id} value={round.id} data-testid={`option-round-${round.id}`}>
                    {formatRoundOption(round)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Round Details */}
        {selectedRound && selectedPlayer && (
          <Card className="p-6 space-y-6">
            {/* Player Info and Round Info */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900" data-testid="text-player-name">
                  {selectedPlayer.name}
                </h2>
                <p className="text-sm text-gray-600" data-testid="text-player-handicap">
                  Handicap: {selectedPlayer.handicap ?? 'N/A'} | Course Hcp: {selectedRound.courseHandicap}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600" data-testid="text-selected-round">Selected Round</p>
                <p className="font-semibold text-gray-900" data-testid="text-round-course">
                  {selectedRound.courseName || selectedRound.course?.name}
                </p>
                <p className="text-sm text-gray-600" data-testid="text-round-date">
                  {format(new Date(selectedRound.playedOn || selectedRound.playedAt), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            {/* Scorecard Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="table-fixed w-full text-xs sm:text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-10" />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 font-medium text-gray-600">Hole</th>
                    {Array.from({length: 9}, (_, i) => (
                      <th key={i} className="text-center py-2 px-1 font-medium text-gray-600">{i + 1}</th>
                    ))}
                    <th className="text-center py-2 px-1 font-medium text-gray-600">OUT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="py-2 px-1 font-medium text-gray-600">Par</td>
                    {pars.slice(0, 9).map((par, i) => (
                      <td key={i} className="text-center py-2 px-1 font-medium whitespace-nowrap">{par}</td>
                    ))}
                    <td className="text-center py-2 px-1 font-bold whitespace-nowrap">{parOut}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-1 font-medium text-gray-600">Score</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const score = selectedRound.cappedScores?.[i];
                      const par = pars[i];
                      if (score === undefined || score === null) {
                        return <td key={i} className="text-center py-2 px-1 text-gray-400">-</td>;
                      }
                      const isPar = score === par;
                      const isBirdie = score === par - 1;
                      const isDoubleBogey = score === par + 2;
                      return (
                        <td key={i} className="text-center py-2 px-1 whitespace-nowrap">
                          {isPar ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-white ring-2 ring-gray-400 font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : isBirdie ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-green-300 text-green-900 ring-1 ring-green-500 font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : isDoubleBogey ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-red-500 text-white font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : (
                            <span className="font-semibold">{score}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 px-1 bg-green-700 text-white font-bold whitespace-nowrap">{scoreOut}</td>
                  </tr>
                </tbody>
              </table>

              <table className="table-fixed w-full text-xs sm:text-sm mt-4">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-10" />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 font-medium text-gray-600">Hole</th>
                    {Array.from({length: 9}, (_, i) => (
                      <th key={i + 9} className="text-center py-2 px-1 font-medium text-gray-600">{i + 10}</th>
                    ))}
                    <th className="text-center py-2 px-1 font-medium text-gray-600">IN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="py-2 px-1 font-medium text-gray-600">Par</td>
                    {pars.slice(9, 18).map((par, i) => (
                      <td key={i + 9} className="text-center py-2 px-1 font-medium whitespace-nowrap">{par}</td>
                    ))}
                    <td className="text-center py-2 px-1 font-bold whitespace-nowrap">{parIn}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-1 font-medium text-gray-600">Score</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const score = selectedRound.cappedScores?.[i + 9];
                      const par = pars[i + 9];
                      if (score === undefined || score === null) {
                        return <td key={i + 9} className="text-center py-2 px-1 text-gray-400">-</td>;
                      }
                      const isPar = score === par;
                      const isBirdie = score === par - 1;
                      const isDoubleBogey = score === par + 2;
                      return (
                        <td key={i + 9} className="text-center py-2 px-1 whitespace-nowrap">
                          {isPar ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-white ring-2 ring-gray-400 font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : isBirdie ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-green-300 text-green-900 ring-1 ring-green-500 font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : isDoubleBogey ? (
                            <span className="inline-flex items-center justify-center size-6 sm:size-7 rounded-full bg-red-500 text-white font-semibold text-xs sm:text-sm">
                              {score}
                            </span>
                          ) : (
                            <span className="font-semibold">{score}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 px-1 bg-green-700 text-white font-bold whitespace-nowrap">{scoreIn}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Round Statistics */}
            <div className="grid grid-cols-4 gap-4 text-center pt-4 border-t">
              <div>
                <div className="text-2xl font-bold text-gray-900" data-testid="stat-round-gross">
                  {selectedRound.grossCapped}
                </div>
                <div className="text-sm text-gray-600 mt-1">Round Gross</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-round-net">
                  {selectedRound.net}
                </div>
                <div className="text-sm text-gray-600 mt-1">Round Net</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" data-testid="stat-round-over">
                  {formatOverPar(typeof selectedRound.overPar === 'string' ? parseFloat(selectedRound.overPar) : selectedRound.overPar)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Round Over</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${getDTHColor(roundDTH)}`} data-testid="stat-round-dth">
                  {formatDTH(roundDTH)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Round DTH</div>
              </div>
            </div>

            {/* Season Averages */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Season Averages</h3>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900" data-testid="stat-season-rounds">
                    {seasonAverages.rounds}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Rounds</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900" data-testid="stat-season-gross">
                    {seasonAverages.avgGross.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg Gross</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600" data-testid="stat-season-net">
                    {seasonAverages.avgNet.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg Net</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600" data-testid="stat-season-over">
                    {formatOverPar(seasonAverages.avgOver)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg Over</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${getDTHColor(seasonAverages.avgDTH)}`} data-testid="stat-season-dth">
                    {formatDTH(seasonAverages.avgDTH)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg DTH</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* No Rounds Message */}
        {selectedPlayerId && playerRounds.length === 0 && (
          <Card className="p-6">
            <div className="text-center text-gray-600" data-testid="text-no-rounds">
              No rounds found for this player.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
