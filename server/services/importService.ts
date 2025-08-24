import { storage } from "../storage";
import { calculateRoundScores } from "./golfCalculations";
import type { InsertRound, InsertPlayer, InsertCourse } from "@shared/schema";

export interface ImportRoundData {
  player_name: string;
  course_name: string;
  played_on: string; // YYYY-MM-DD
  gross_score: number;
  course_handicap: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  summary: {
    playersCreated: number;
    coursesCreated: number;
    roundsImported: number;
  };
}

/**
 * Service for importing historical round data
 */
export class ImportService {
  /**
   * Import rounds from CSV data
   */
  async importRounds(
    csvData: ImportRoundData[],
    options: {
      autoCreatePlayers: boolean;
      autoCreateCourses: boolean;
    } = { autoCreatePlayers: false, autoCreateCourses: false }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      summary: {
        playersCreated: 0,
        coursesCreated: 0,
        roundsImported: 0,
      },
    };

    for (let i = 0; i < csvData.length; i++) {
      try {
        const rowData = csvData[i];
        const rowNumber = i + 1;

        // Validate required fields
        if (!rowData.player_name || !rowData.course_name || !rowData.played_on || !rowData.gross_score || rowData.course_handicap === undefined) {
          result.errors.push(`Row ${rowNumber}: Missing required fields (player_name, course_name, played_on, gross_score, course_handicap)`);
          result.skipped++;
          continue;
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.played_on)) {
          result.errors.push(`Row ${rowNumber}: Invalid date format. Use YYYY-MM-DD`);
          result.skipped++;
          continue;
        }

        // Validate gross score
        if (rowData.gross_score < 50 || rowData.gross_score > 150) {
          result.errors.push(`Row ${rowNumber}: Invalid gross score. Must be between 50 and 150`);
          result.skipped++;
          continue;
        }

        // Validate course handicap
        if (rowData.course_handicap < 0 || rowData.course_handicap > 54) {
          result.errors.push(`Row ${rowNumber}: Invalid course handicap. Must be between 0 and 54`);
          result.skipped++;
          continue;
        }

        // Find or create player
        let player = await storage.getPlayerByEmail(rowData.player_name);
        if (!player) {
          const playerByName = await this.findPlayerByName(rowData.player_name);
          if (playerByName) {
            player = playerByName;
          } else if (options.autoCreatePlayers) {
            player = await storage.createPlayer({
              name: rowData.player_name,
              email: null,
              phone: null,
              currentHandicap: rowData.course_handicap || 0,
              isAdmin: false,
            });
            result.summary.playersCreated++;
          } else {
            result.errors.push(`Row ${rowNumber}: Player '${rowData.player_name}' not found`);
            result.skipped++;
            continue;
          }
        }

        // Find or create course
        let course = await storage.getCourseByName(rowData.course_name);
        if (!course) {
          if (options.autoCreateCourses) {
            // Create course with default values
            course = await storage.createCourse({
              name: rowData.course_name,
              tees: 'Blue',
              parTotal: 72, // Default par - admin can update later
            });
            result.summary.coursesCreated++;
            
            // Create default holes (par 4 for all holes initially)
            const defaultHoles = Array.from({ length: 18 }, (_, index) => ({
              courseId: course.id,
              number: index + 1,
              par: 4,
              distance: 400,
            }));
            await storage.createHoles(defaultHoles);
          } else {
            result.errors.push(`Row ${rowNumber}: Course '${rowData.course_name}' not found`);
            result.skipped++;
            continue;
          }
        }

        // Get course holes for par calculation
        const holes = await storage.getHolesByCourse(course.id);
        if (holes.length !== 18) {
          result.errors.push(`Row ${rowNumber}: Course '${rowData.course_name}' does not have 18 holes configured`);
          result.skipped++;
          continue;
        }

        // Calculate net score and over par from gross score
        const net = rowData.gross_score - rowData.course_handicap;
        const overPar = rowData.gross_score - course.parTotal;
        
        // Create dummy raw scores array (we don't have hole-by-hole data)
        // Use average score per hole based on gross total
        const avgScorePerHole = Math.round(rowData.gross_score / 18);
        const rawScores = Array(18).fill(avgScorePerHole);

        // Create round
        const roundData: InsertRound = {
          playerId: player.id,
          courseId: course.id,
          playedOn: rowData.played_on,
          rawScores,
          courseHandicap: rowData.course_handicap,
          source: 'import',
          status: 'ok',
        };

        await storage.createRound(roundData);
        result.imported++;
        result.summary.roundsImported++;

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.skipped++;
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Parse CSV text to ImportRoundData array
   */
  parseCSV(csvText: string): ImportRoundData[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data: ImportRoundData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'gross_score' || header === 'course_handicap') {
          row[header] = parseInt(value, 10);
        } else {
          row[header] = value;
        }
      });

      data.push(row as ImportRoundData);
    }

    return data;
  }

  /**
   * Find player by name (fuzzy matching)
   */
  private async findPlayerByName(name: string): Promise<any> {
    const players = await storage.getAllPlayers();
    return players.find(p => 
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(p.name.toLowerCase())
    );
  }

  /**
   * Generate sample CSV format
   */
  getSampleCSV(): string {
    return `player_name,course_name,played_on,gross_score,course_handicap
Ashok Hiremath,Willingdon Golf Club,2024-12-28,85,16
Dev Bhattacharya,BPGC,2024-12-26,78,13
Debashish Das,US Club,2024-12-30,92,14`;
  }
}

export const importService = new ImportService();
