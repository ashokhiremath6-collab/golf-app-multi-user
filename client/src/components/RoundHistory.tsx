import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Round {
  id: string;
  courseId: string;
  playedOn: string;
  courseName: string;
  grossCapped: number;
  net: number;
  overPar: string;
  rawScores: number[];
  cappedScores: number[];
  course: {
    name: string;
    tees: string;
    slope: number | null;
  };
}

interface Hole {
  id: string;
  courseId: string;
  number: number;
  par: number;
  distance: number | null;
}

interface RoundHistoryProps {
  rounds: Round[];
}

export default function RoundHistory({ rounds }: RoundHistoryProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  const toggleRoundDetails = (roundId: string) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundId)) {
      newExpanded.delete(roundId);
    } else {
      newExpanded.add(roundId);
    }
    setExpandedRounds(newExpanded);
  };

  const renderHoleByHoleDetails = (round: Round) => {
    // Use mock hole data for now (will implement real data fetching properly later)
    const holes: Hole[] = Array.from({ length: 18 }, (_, index) => ({
      id: `hole-${index + 1}`,
      courseId: round.courseId || '',
      number: index + 1,
      par: index < 4 ? 4 : index < 8 ? 3 : index < 13 ? 4 : 3, // Simplified par pattern
      distance: index < 4 ? 400 : index < 8 ? 150 : index < 13 ? 420 : 160,
    }));
    const holesLoading = false;

    if (holesLoading) {
      return (
        <div className="space-y-4" data-testid={`round-details-${round.id}`}>
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded h-4 w-48 mb-3"></div>
            <div className="bg-gray-200 rounded h-24"></div>
          </div>
        </div>
      );
    }

    if (!holes || holes.length !== 18) {
      return (
        <div className="space-y-4" data-testid={`round-details-${round.id}`}>
          <p className="text-gray-500">Hole data not available for this round.</p>
        </div>
      );
    }

    // Calculate totals
    const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
    const totalScore = round.rawScores.reduce((sum, score) => sum + score, 0);
    const totalCapped = round.cappedScores.reduce((sum, score) => sum + score, 0);

    const renderNineHoles = (startHole: number, title: string) => {
      const nineHoles = holes.slice(startHole, startHole + 9);
      const ninePar = nineHoles.reduce((sum, hole) => sum + hole.par, 0);
      const nineScore = round.rawScores.slice(startHole, startHole + 9).reduce((sum, score) => sum + score, 0);
      const nineCapped = round.cappedScores.slice(startHole, startHole + 9).reduce((sum, score) => sum + score, 0);

      return (
        <div className="overflow-x-auto mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">{title}</h5>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Hole Numbers Row */}
            <div className="grid grid-cols-10 gap-0 bg-gray-50 border-b">
              <div className="px-2 py-2 text-xs font-medium text-gray-600 border-r">Hole</div>
              {nineHoles.map(hole => (
                <div key={hole.number} className="px-1 py-2 text-center text-xs font-medium border-r last:border-r-0" data-testid={`hole-${hole.number}-header`}>
                  {hole.number}
                </div>
              ))}
              <div className="px-2 py-2 text-xs font-medium text-gray-600 text-center">Total</div>
            </div>
            
            {/* Par Row */}
            <div className="grid grid-cols-10 gap-0 bg-white border-b">
              <div className="px-2 py-2 text-xs font-medium text-gray-600 border-r">Par</div>
              {nineHoles.map(hole => (
                <div key={hole.number} className="px-1 py-2 text-center text-sm font-medium border-r last:border-r-0" data-testid={`hole-${hole.number}-par`}>
                  {hole.par}
                </div>
              ))}
              <div className="px-2 py-2 text-center text-sm font-bold text-gray-900">
                {ninePar}
              </div>
            </div>
            
            {/* Score Row */}
            <div className="grid grid-cols-10 gap-0 bg-white border-b">
              <div className="px-2 py-2 text-xs font-medium text-gray-600 border-r">Score</div>
              {round.rawScores.slice(startHole, startHole + 9).map((score, index) => {
                const holeIndex = startHole + index;
                const hole = nineHoles[index];
                const isOver = score > hole.par;
                const isUnder = score < hole.par;
                return (
                  <div 
                    key={holeIndex} 
                    className={`px-1 py-2 text-center text-sm font-bold border-r last:border-r-0 ${
                      isOver ? 'text-red-600' : isUnder ? 'text-green-600' : 'text-gray-900'
                    }`}
                    data-testid={`hole-${holeIndex + 1}-score`}
                  >
                    {score}
                  </div>
                );
              })}
              <div className="px-2 py-2 text-center text-sm font-bold text-golf-blue">
                {nineScore}
              </div>
            </div>
            
            {/* Capped Score Row */}
            <div className="grid grid-cols-10 gap-0 bg-gray-50">
              <div className="px-2 py-2 text-xs font-medium text-gray-600 border-r">Capped</div>
              {round.cappedScores.slice(startHole, startHole + 9).map((score, index) => (
                <div key={index} className="px-1 py-2 text-center text-sm text-golf-green border-r last:border-r-0" data-testid={`hole-${startHole + index + 1}-capped`}>
                  {score}
                </div>
              ))}
              <div className="px-2 py-2 text-center text-sm font-bold text-golf-green">
                {nineCapped}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4" data-testid={`round-details-${round.id}`}>
        <h4 className="font-medium text-gray-900 mb-3" data-testid="text-hole-breakdown">
          Scorecard
        </h4>
        
        {/* Front 9 */}
        {renderNineHoles(0, "Front 9")}
        
        {/* Back 9 */}
        {renderNineHoles(9, "Back 9")}
        
        {/* Overall Totals */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h5 className="text-sm font-medium text-gray-700 mb-2">18-Hole Totals</h5>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900" data-testid={`total-par-${round.id}`}>
                {totalPar}
              </div>
              <div className="text-xs text-gray-600">Par</div>
            </div>
            <div>
              <div className="text-lg font-bold text-golf-blue" data-testid={`total-score-${round.id}`}>
                {totalScore}
              </div>
              <div className="text-xs text-gray-600">Score</div>
            </div>
            <div>
              <div className="text-lg font-bold text-golf-green" data-testid={`total-capped-${round.id}`}>
                {totalCapped}
              </div>
              <div className="text-xs text-gray-600">Capped</div>
            </div>
            <div>
              <div className="text-lg font-bold text-golf-gold" data-testid={`total-over-par-${round.id}`}>
                {totalScore > totalPar ? '+' : ''}{totalScore - totalPar}
              </div>
              <div className="text-xs text-gray-600">Over Par</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="component-round-history">
      {rounds.map((round) => (
        <Card key={round.id} className="hover:shadow-md transition-shadow" data-testid={`card-round-${round.id}`}>
          <Collapsible 
            open={expandedRounds.has(round.id)}
            onOpenChange={() => toggleRoundDetails(round.id)}
          >
            <CollapsibleTrigger asChild>
              <div className="p-4 cursor-pointer w-full" data-testid={`button-expand-round-${round.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-medium text-gray-900" data-testid={`text-course-name-${round.id}`}>
                          {round.course?.name || 'Golf Course'}
                        </h3>
                        <p className="text-sm text-gray-600" data-testid={`text-round-date-${round.id}`}>
                          {new Date(round.playedOn).toLocaleDateString()} • {round.course?.tees || 'Blue'} Tees
                        </p>
                        {round.course?.slope && (
                          <p className="text-xs text-gray-500" data-testid={`text-slope-rating-${round.id}`}>
                            Slope Rating: {round.course.slope}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="font-bold text-lg" data-testid={`text-gross-${round.id}`}>
                        {round.grossCapped}
                      </div>
                      <div className="text-xs text-gray-600">Gross</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-golf-blue" data-testid={`text-net-${round.id}`}>
                        {round.net}
                      </div>
                      <div className="text-xs text-gray-600">Net</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-golf-gold" data-testid={`text-over-par-${round.id}`}>
                        {parseFloat(round.overPar) > 0 ? '+' : ''}{parseFloat(round.overPar).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">Over Par</div>
                    </div>
                    <i 
                      className={`fas fa-chevron-down text-gray-400 transform transition-transform ${
                        expandedRounds.has(round.id) ? 'rotate-180' : ''
                      }`}
                      data-testid={`icon-expand-${round.id}`}
                    ></i>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {renderHoleByHoleDetails(round)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
