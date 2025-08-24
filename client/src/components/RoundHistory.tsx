import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Round {
  id: string;
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
  };
}

interface Hole {
  number: number;
  par: number;
  distance: number;
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
    // Mock hole data for demonstration - in real app this would come from the holes API
    const holes: Hole[] = Array.from({ length: 18 }, (_, index) => ({
      number: index + 1,
      par: index < 4 ? 4 : index < 8 ? 3 : index < 13 ? 4 : 3, // Simplified par pattern
      distance: index < 4 ? 400 : index < 8 ? 150 : index < 13 ? 420 : 160,
    }));

    return (
      <div className="space-y-4" data-testid={`round-details-${round.id}`}>
        <h4 className="font-medium text-gray-900 mb-3" data-testid="text-hole-breakdown">
          Hole-by-Hole Breakdown
        </h4>
        
        {/* Front 9 */}
        <div className="overflow-x-auto">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Front 9</h5>
          <div className="grid grid-cols-10 gap-1 text-xs">
            <div className="font-medium text-gray-600">Hole</div>
            {holes.slice(0, 9).map(hole => (
              <div key={hole.number} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                {hole.number}
              </div>
            ))}
            
            <div className="text-gray-600">Par</div>
            {holes.slice(0, 9).map(hole => (
              <div key={hole.number} className="text-center" data-testid={`hole-${hole.number}-par`}>
                {hole.par}
              </div>
            ))}
            
            <div className="text-gray-600">Raw</div>
            {round.rawScores.slice(0, 9).map((score, index) => (
              <div key={index} className="text-center" data-testid={`hole-${index + 1}-raw`}>
                {score}
              </div>
            ))}
            
            <div className="text-golf-green">Capped</div>
            {round.cappedScores.slice(0, 9).map((score, index) => (
              <div key={index} className="text-center text-golf-green" data-testid={`hole-${index + 1}-capped`}>
                {score}
              </div>
            ))}
          </div>
        </div>

        {/* Back 9 */}
        <div className="overflow-x-auto">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Back 9</h5>
          <div className="grid grid-cols-10 gap-1 text-xs">
            <div className="font-medium text-gray-600">Hole</div>
            {holes.slice(9, 18).map(hole => (
              <div key={hole.number} className="text-center font-medium" data-testid={`hole-${hole.number}-header`}>
                {hole.number}
              </div>
            ))}
            
            <div className="text-gray-600">Par</div>
            {holes.slice(9, 18).map(hole => (
              <div key={hole.number} className="text-center" data-testid={`hole-${hole.number}-par`}>
                {hole.par}
              </div>
            ))}
            
            <div className="text-gray-600">Raw</div>
            {round.rawScores.slice(9, 18).map((score, index) => (
              <div key={index} className="text-center" data-testid={`hole-${index + 10}-raw`}>
                {score}
              </div>
            ))}
            
            <div className="text-golf-green">Capped</div>
            {round.cappedScores.slice(9, 18).map((score, index) => (
              <div key={index} className="text-center text-golf-green" data-testid={`hole-${index + 10}-capped`}>
                {score}
              </div>
            ))}
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
