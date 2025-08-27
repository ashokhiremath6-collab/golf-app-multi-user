import XLSX from 'xlsx';
import { storage } from '../storage';
import { calculateRoundScores } from './golfCalculations';
import { db } from '../db';
import { rounds } from '@shared/schema';
import type { InsertRound, InsertPlayer, InsertCourse } from '@shared/schema';

export interface ImportRecord {
  Date: number;
  'Player name': string;
  'Handicap ': number;
  'Gross ': number;
  Course: string;
}

export class DataImportService {
  /**
   * Convert Excel date number to YYYY-MM-DD format
   */
  private excelDateToString(excelDate: number): string {
    // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
    return jsDate.toISOString().split('T')[0];
  }

  /**
   * Estimate capped scores from gross total and course par
   * Since we don't have hole-by-hole data, we'll estimate reasonable capped scores
   */
  private estimateCappedScores(grossTotal: number, courseParTotal: number = 72): number[] {
    const overPar = grossTotal - courseParTotal;
    const averageOverParPerHole = overPar / 18;
    
    // Create realistic score distribution
    const cappedScores: number[] = [];
    let remainingStrokes = grossTotal;
    
    // Standard par distribution: 4 par-3s, 10 par-4s, 4 par-5s
    const parValues = [4,4,3,4,5,4,3,4,4,5,4,3,4,4,5,4,3,5]; // Example layout
    
    for (let i = 0; i < 18; i++) {
      const par = parValues[i];
      const maxScore = par + 2; // Double bogey cap
      
      // Estimate score based on remaining strokes and holes left
      const holesLeft = 18 - i;
      const avgStrokesPerHole = remainingStrokes / holesLeft;
      
      let estimatedScore = Math.round(Math.max(par, Math.min(maxScore, avgStrokesPerHole)));
      
      // Adjust if this would exceed remaining strokes
      if (estimatedScore > remainingStrokes - (holesLeft - 1)) {
        estimatedScore = Math.max(1, remainingStrokes - (holesLeft - 1));
      }
      
      cappedScores.push(estimatedScore);
      remainingStrokes -= estimatedScore;
    }
    
    return cappedScores;
  }

  /**
   * Import historical data from Excel file
   */
  async importHistoricalData(filePath: string): Promise<{
    playersCreated: number;
    coursesCreated: number;
    roundsImported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let playersCreated = 0;
    let coursesCreated = 0;
    let roundsImported = 0;

    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records: ImportRecord[] = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Found ${records.length} records to import`);

      // Get existing players and courses
      const existingPlayers = await storage.getAllPlayers();
      const existingCourses = await storage.getAllCourses();

      const playerMap = new Map(existingPlayers.map(p => [p.name.toLowerCase().trim(), p]));
      const courseMap = new Map(existingCourses.map(c => [c.name.toLowerCase().trim(), c]));

      // Process each record
      for (const record of records) {
        try {
          const playerName = record['Player name']?.toString().trim();
          const courseName = record.Course?.toString().trim() || 'Willingdon';
          const handicap = parseInt(record['Handicap ']?.toString() || '0');
          const grossScore = parseInt(record['Gross ']?.toString() || '0');
          const playDate = this.excelDateToString(record.Date);

          if (!playerName || !grossScore) {
            errors.push(`Skipping record: missing player name or gross score`);
            continue;
          }

          // Create or get player
          let player = playerMap.get(playerName.toLowerCase());
          if (!player) {
            const newPlayer: InsertPlayer = {
              name: playerName,
              currentHandicap: handicap,
              isAdmin: false,
            };
            player = await storage.createPlayer(newPlayer);
            playerMap.set(playerName.toLowerCase(), player);
            playersCreated++;
            console.log(`Created player: ${playerName}`);
          }

          // Create or get course
          let course = courseMap.get(courseName.toLowerCase());
          if (!course) {
            const newCourse: InsertCourse = {
              name: courseName,
              tees: 'Blue',
              parTotal: 72, // Standard par
            };
            course = await storage.createCourse(newCourse);
            courseMap.set(courseName.toLowerCase(), course);
            coursesCreated++;
            console.log(`Created course: ${courseName}`);
          }

          // Create holes if not exists
          const existingHoles = await storage.getHolesByCourse(course.id);
          if (existingHoles.length === 0) {
            // Create standard holes
            const standardPars = [4,4,3,4,5,4,3,4,4,5,4,3,4,4,5,4,3,5];
            for (let i = 0; i < 18; i++) {
              await storage.createHole({
                courseId: course.id,
                number: i + 1,
                par: standardPars[i],
                distance: 400, // Standard distance
              });
            }
          }

          // Get course holes for calculation
          const holes = await storage.getHolesByCourse(course.id);
          const holePars = holes.sort((a, b) => a.number - b.number).map(h => h.par);

          // Estimate capped scores and calculate round scores
          const estimatedCappedScores = this.estimateCappedScores(grossScore, course.parTotal);
          const scoreCalc = calculateRoundScores(
            estimatedCappedScores, // Use estimated as raw scores
            holePars,
            handicap,
            course.parTotal
          );

          // Create round with calculated scores
          const round: InsertRound = {
            playerId: player.id,
            courseId: course.id,
            playedOn: playDate,
            rawScores: scoreCalc.rawScores,
            courseHandicap: handicap,
            source: 'import',
            status: 'ok',
          };

          // Create the full round record with calculated values
          const [created] = await db
            .insert(rounds)
            .values({
              ...round,
              cappedScores: scoreCalc.cappedScores,
              grossCapped: scoreCalc.grossCapped,
              net: scoreCalc.net,
              overPar: scoreCalc.overPar.toString(),
            } as any)
            .returning();
          roundsImported++;
          console.log(`Imported round for ${playerName} on ${playDate}: ${grossScore}`);

        } catch (error) {
          errors.push(`Error processing record for ${record['Player name']}: ${error}`);
          console.error('Error processing record:', error);
        }
      }

    } catch (error) {
      errors.push(`Failed to read Excel file: ${error}`);
      console.error('Import error:', error);
    }

    return {
      playersCreated,
      coursesCreated,
      roundsImported,
      errors,
    };
  }

  /**
   * Clear all test/dummy data before import
   */
  async clearTestData(): Promise<{ cleared: boolean; message: string }> {
    try {
      // Clear rounds first (due to foreign key constraints)
      await storage.clearAllRounds();
      console.log('Cleared all rounds');
      
      return {
        cleared: true,
        message: 'Test data cleared successfully'
      };
    } catch (error) {
      console.error('Error clearing test data:', error);
      return {
        cleared: false,
        message: `Error clearing data: ${error}`
      };
    }
  }
}

export const dataImportService = new DataImportService();