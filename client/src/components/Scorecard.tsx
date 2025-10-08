import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScorecardProps {
  round: {
    id: string;
    courseName: string;
    courseTees: string;
    playedAt: string;
    rawScores: number[];
    grossScore: number;
    netScore: number;
    overPar: number;
    handicapAtTime?: number;
    courseHandicap: number;
    courseParTotal: number;
    course?: {
      slope?: number;
    };
    slopeAdjustedCourseHandicap?: number;
  };
  holes?: {
    number: number;
    par: number;
    distance?: number;
  }[];
  playerName?: string;
  showTitle?: boolean;
}

export default function Scorecard({ round, holes, playerName, showTitle = true }: ScorecardProps) {
  // Calculate par for each hole (fallback if holes data not available)
  const getHolePar = (holeNumber: number): number => {
    const hole = holes?.find(h => h.number === holeNumber);
    return hole?.par || 4; // Default to par 4 if not found
  };

  // Get score relative to par (for coloring)
  const getScoreClass = (score: number, par: number): string => {
    const diff = score - par;
    if (diff <= -2) return "bg-blue-500 text-white font-bold"; // Eagle or better
    if (diff === -1) return "bg-green-500 text-white font-bold"; // Birdie
    if (diff === 0) return ""; // Par
    if (diff === 1) return "bg-yellow-100 font-bold"; // Bogey
    if (diff === 2) return "bg-orange-100 font-bold"; // Double bogey
    return "bg-red-100 font-bold"; // Triple+ bogey
  };

  // Calculate front 9 and back 9 totals
  const front9Par = Array.from({ length: 9 }, (_, i) => getHolePar(i + 1)).reduce((a, b) => a + b, 0);
  const back9Par = Array.from({ length: 9 }, (_, i) => getHolePar(i + 10)).reduce((a, b) => a + b, 0);
  
  const front9Score = round.rawScores.slice(0, 9).reduce((a, b) => a + b, 0);
  const back9Score = round.rawScores.slice(9, 18).reduce((a, b) => a + b, 0);

  // Calculate DTH (Differential to Handicap) using slope-adjusted course handicap
  // DTH = Over Par - Course Handicap (slope-adjusted)
  const courseHcp = round.slopeAdjustedCourseHandicap !== undefined 
    ? round.slopeAdjustedCourseHandicap 
    : round.courseHandicap;
  const dth = round.overPar - courseHcp;

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              {playerName && (
                <CardTitle className="text-lg mb-1">{playerName}</CardTitle>
              )}
              <p className="text-sm text-gray-600">
                Handicap: {round.handicapAtTime || 0} | Course Hcp: {courseHcp}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{round.courseName}</p>
              <p className="text-sm text-gray-600">
                {round.course?.slope && <>Slope: {round.course.slope} | </>}
                {new Date(round.playedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="mb-4">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Full Scorecard:</h3>
          </div>

          {/* Front 9 */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-center text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-2 px-2 text-xs font-medium text-gray-600">Hole</th>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                    <th key={hole} className="py-2 px-2 text-xs font-medium text-gray-600">{hole}</th>
                  ))}
                  <th className="py-2 px-2 text-xs font-bold text-gray-700 bg-gray-100">OUT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-xs font-medium text-gray-600">Par</td>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                    <td key={hole} className="py-2 px-2 text-xs">{getHolePar(hole)}</td>
                  ))}
                  <td className="py-2 px-2 text-xs font-bold bg-gray-100">{front9Par}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-xs font-medium text-gray-600">Score</td>
                  {Array.from({ length: 9 }, (_, i) => i).map(index => {
                    const holeNumber = index + 1;
                    const score = round.rawScores[index];
                    const par = getHolePar(holeNumber);
                    return (
                      <td key={holeNumber} className={`py-2 px-2 text-xs ${getScoreClass(score, par)}`}>
                        {score}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-xs font-bold bg-green-600 text-white">{front9Score}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Back 9 */}
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-2 px-2 text-xs font-medium text-gray-600">Hole</th>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                    <th key={hole} className="py-2 px-2 text-xs font-medium text-gray-600">{hole}</th>
                  ))}
                  <th className="py-2 px-2 text-xs font-bold text-gray-700 bg-gray-100">IN</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-xs font-medium text-gray-600">Par</td>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                    <td key={hole} className="py-2 px-2 text-xs">{getHolePar(hole)}</td>
                  ))}
                  <td className="py-2 px-2 text-xs font-bold bg-gray-100">{back9Par}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-xs font-medium text-gray-600">Score</td>
                  {Array.from({ length: 9 }, (_, i) => i + 9).map(index => {
                    const holeNumber = index + 10;
                    const score = round.rawScores[index];
                    const par = getHolePar(holeNumber);
                    return (
                      <td key={holeNumber} className={`py-2 px-2 text-xs ${getScoreClass(score, par)}`}>
                        {score}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-xs font-bold bg-green-600 text-white">{back9Score}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t-2 border-gray-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{round.grossScore}</div>
            <div className="text-xs text-gray-600 mt-1">Gross Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{round.netScore}</div>
            <div className="text-xs text-gray-600 mt-1">Net Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {round.overPar > 0 ? `+${round.overPar}` : round.overPar}
            </div>
            <div className="text-xs text-gray-600 mt-1">Over Par</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {dth > 0 ? `+${dth}` : dth}
            </div>
            <div className="text-xs text-gray-600 mt-1">DTH</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
