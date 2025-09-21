/**
 * Golf calculation utilities following exact rules specified
 */

export interface ScoreCalculation {
  rawScores: number[];
  cappedScores: number[];
  grossCapped: number;
  net: number;
  overPar: number;
}

/**
 * Cap per hole score to double bogey (par + 2)
 */
export function capPerHole(rawScore: number, par: number): number {
  return Math.min(rawScore, par + 2);
}

/**
 * Compute gross capped score (sum of all capped scores)
 */
export function computeGrossCapped(cappedScores: number[]): number {
  return cappedScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Compute net score (gross capped - course handicap)
 */
export function computeNet(grossCapped: number, courseHandicap: number): number {
  return grossCapped - courseHandicap;
}

/**
 * Compute over par (gross capped - course par total)
 */
export function computeOverPar(grossCapped: number, courseParTotal: number): number {
  return grossCapped - courseParTotal;
}

/**
 * Calculate complete round scores
 */
export function calculateRoundScores(
  rawScores: number[],
  holePars: number[],
  courseHandicap: number,
  courseParTotal: number
): ScoreCalculation {
  if (rawScores.length !== 18 || holePars.length !== 18) {
    throw new Error('Must provide exactly 18 hole scores and pars');
  }

  // Cap each hole score
  const cappedScores = rawScores.map((score, index) => 
    capPerHole(score, holePars[index])
  );

  const grossCapped = computeGrossCapped(cappedScores);
  const net = computeNet(grossCapped, courseHandicap);
  const overPar = computeOverPar(grossCapped, courseParTotal);

  return {
    rawScores,
    cappedScores,
    grossCapped,
    net,
    overPar,
  };
}

/**
 * Monthly handicap update calculation
 */
export function monthlyHandicapUpdate(
  avgMonthlyOverPar: number,
  previousHandicap: number,
  kFactor: number = 0.3,
  changeCap: number = 2.0
): number {
  // Calculate new handicap using weighted average
  const newHandicapUnclamped = kFactor * avgMonthlyOverPar + (1 - kFactor) * previousHandicap;
  
  // Limit change to ±changeCap
  const delta = newHandicapUnclamped - previousHandicap;
  const clampedDelta = Math.max(-changeCap, Math.min(changeCap, delta));
  const newHandicapClamped = previousHandicap + clampedDelta;
  
  // Floor at 0
  const newHandicapFloored = Math.max(0, newHandicapClamped);
  
  // Custom rounding: 17.4 and below → 17, 17.5 and above → 18
  // This is standard mathematical rounding, but making it explicit
  const decimalPart = newHandicapFloored - Math.floor(newHandicapFloored);
  if (decimalPart < 0.5) {
    return Math.floor(newHandicapFloored);
  } else {
    return Math.ceil(newHandicapFloored);
  }
}

/**
 * Calculate average over par for a set of rounds
 */
export function calculateAverageOverPar(overParValues: number[]): number {
  if (overParValues.length === 0) return 0;
  const sum = overParValues.reduce((acc, val) => acc + val, 0);
  return sum / overParValues.length;
}

/**
 * SLOPE-ADJUSTED HANDICAP CALCULATIONS
 */

/**
 * Convert Willingdon-based handicap to Handicap Index
 * Current handicaps are based on Willingdon (slope 110)
 */
export function calculateHandicapIndex(willingdonHandicap: number): number {
  return (willingdonHandicap * 113) / 110;
}

/**
 * Calculate course handicap using slope rating
 * Formula: Course Handicap = round(Handicap Index × Slope Rating ÷ 113)
 */
export function calculateCourseHandicap(handicapIndex: number, slopeRating: number): number {
  return Math.round((handicapIndex * slopeRating) / 113);
}

/**
 * Calculate slope-adjusted DTH (Difference to Handicap)
 * DTH = Over Par - Course Handicap (slope-adjusted)
 */
export function calculateSlopeAdjustedDTH(overPar: number, slopeAdjustedCourseHandicap: number): number {
  return overPar - slopeAdjustedCourseHandicap;
}

/**
 * Calculate normalized over par to compare across courses
 * Normalizes performance to Willingdon baseline (slope 110)
 */
export function calculateNormalizedOverPar(
  overPar: number, 
  handicapIndex: number, 
  courseSlopeRating: number
): number {
  const courseHandicap = calculateCourseHandicap(handicapIndex, courseSlopeRating);
  const willingdonHandicap = calculateCourseHandicap(handicapIndex, 110);
  return overPar - (courseHandicap - willingdonHandicap);
}

/**
 * Get slope-adjusted round data with all calculated fields
 */
export function calculateSlopeAdjustedRound(
  overPar: number,
  willingdonHandicap: number,
  courseSlopeRating: number
) {
  const handicapIndex = calculateHandicapIndex(willingdonHandicap);
  const slopeAdjustedCourseHandicap = calculateCourseHandicap(handicapIndex, courseSlopeRating);
  const slopeAdjustedDTH = calculateSlopeAdjustedDTH(overPar, slopeAdjustedCourseHandicap);
  const normalizedOverPar = calculateNormalizedOverPar(overPar, handicapIndex, courseSlopeRating);

  return {
    handicapIndex,
    slopeAdjustedCourseHandicap,
    slopeAdjustedDTH,
    normalizedOverPar
  };
}
