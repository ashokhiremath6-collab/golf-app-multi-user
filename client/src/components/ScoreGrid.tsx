import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Hole {
  id: string;
  number: number;
  par: number;
  distance: number;
}

interface ScoreGridProps {
  holes: Hole[];
  scores: number[];
  onScoreChange: (holeIndex: number, score: number) => void;
}

export default function ScoreGrid({ holes, scores, onScoreChange }: ScoreGridProps) {
  const handleScoreChange = (holeIndex: number, value: string) => {
    const score = parseInt(value) || 0;
    if (score >= 1 && score <= 10) {
      onScoreChange(holeIndex, score);
    }
  };

  const handleIncrement = (holeIndex: number) => {
    const currentScore = scores[holeIndex] || holes[holeIndex]?.par || 0;
    const newScore = currentScore + 1;
    if (newScore <= 10) {
      onScoreChange(holeIndex, newScore);
    }
  };

  const handleDecrement = (holeIndex: number) => {
    const currentScore = scores[holeIndex] || holes[holeIndex]?.par || 0;
    const newScore = currentScore - 1;
    if (newScore >= 1) {
      onScoreChange(holeIndex, newScore);
    }
  };

  const getDisplayScore = (holeIndex: number) => {
    return scores[holeIndex] || holes[holeIndex]?.par || 0;
  };

  const calculateNineTotal = (startHole: number) => {
    return scores.slice(startHole, startHole + 9).reduce((sum, score, index) => {
      const actualScore = score || holes[startHole + index]?.par || 0;
      return sum + actualScore;
    }, 0);
  };

  const renderNineHoles = (startHole: number, title: string) => {
    const nineHoles = holes.slice(startHole, startHole + 9);
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid={`card-${title.toLowerCase().replace(' ', '-')}`}>
        <div className="bg-gray-100 px-4 py-2 font-medium text-sm" data-testid={`text-${title.toLowerCase().replace(' ', '-')}-title`}>
          {title}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 p-4" data-testid={`grid-${title.toLowerCase().replace(' ', '-')}`}>
          {nineHoles.map((hole, index) => {
            const holeIndex = startHole + index;
            return (
              <div key={hole.id} className="text-center" data-testid={`hole-${hole.number}`}>
                <div className="text-xs text-gray-600 mb-1">Hole {hole.number}</div>
                <div className="text-sm font-medium mb-1">Par {hole.par}</div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecrement(holeIndex)}
                    className="w-8 h-8 p-0 hover:bg-red-50 hover:border-red-300"
                    data-testid={`button-decrement-${hole.number}`}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={getDisplayScore(holeIndex)}
                    onChange={(e) => handleScoreChange(holeIndex, e.target.value)}
                    className="w-12 px-1 py-1 text-center font-bold text-lg border-2 focus:border-golf-green"
                    data-testid={`input-score-${hole.number}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncrement(holeIndex)}
                    className="w-8 h-8 p-0 hover:bg-green-50 hover:border-green-300"
                    data-testid={`button-increment-${hole.number}`}
                  >
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Nine Summary */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200" data-testid={`summary-${title.toLowerCase().replace(' ', '-')}`}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-900">{title}:</span>
            <span className="font-bold text-xl text-golf-green" data-testid={`text-${title.toLowerCase().replace(' ', '-')}-total`}>
              {calculateNineTotal(startHole)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="component-score-grid">
      <h3 className="font-medium text-gray-900 mb-4" data-testid="text-enter-scores">
        Enter Scores
      </h3>
      
      {/* Front 9 */}
      {renderNineHoles(0, 'Front 9')}
      
      {/* Back 9 */}
      {renderNineHoles(9, 'Back 9')}
    </div>
  );
}
