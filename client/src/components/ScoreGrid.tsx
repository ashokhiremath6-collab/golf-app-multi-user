import { Input } from "@/components/ui/input";

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
    if (score >= 0 && score <= 10) {
      onScoreChange(holeIndex, score);
    }
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
                <div className="text-sm font-medium mb-1">Par {hole.par} {/* DEBUG: {JSON.stringify({id: hole.id, par: hole.par, distance: hole.distance})} */}</div>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={scores[holeIndex] || ''}
                  onChange={(e) => handleScoreChange(holeIndex, e.target.value)}
                  className="w-full px-2 py-2 text-center font-medium text-lg"
                  placeholder={hole.par.toString()}
                  data-testid={`input-score-${hole.number}`}
                />
                <div className="text-xs text-gray-500 mt-1">{hole.distance}y</div>
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
