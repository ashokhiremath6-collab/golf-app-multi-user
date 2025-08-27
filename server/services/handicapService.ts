import { storage } from "../storage";
import { monthlyHandicapUpdate, calculateAverageOverPar } from "./golfCalculations";
import type { InsertHandicapSnapshot } from "@shared/schema";

/**
 * Monthly handicap recalculation service
 */
export class HandicapService {
  /**
   * Run handicap recalculation for a specific month or previous month
   */
  async runMonthlyRecalculation(targetMonth?: string): Promise<{
    month: string;
    playersUpdated: number;
    snapshots: any[];
  }> {
    const month = targetMonth || this.getPreviousMonth();
    const players = await storage.getAllPlayers();
    const seasonSettings = await storage.getSeasonSettings();
    
    const kFactor = parseFloat(seasonSettings.kFactor?.toString() || '0.3');
    const changeCap = parseFloat(seasonSettings.changeCap?.toString() || '2.0');
    
    const snapshots = [];
    let playersUpdated = 0;

    for (const player of players) {
      // Check if we already have a snapshot for this month
      const existingSnapshot = await storage.getHandicapSnapshotByMonth(player.id, month);
      if (existingSnapshot) {
        continue; // Skip if already processed
      }

      // Get rounds for the target month
      const monthlyRounds = await storage.getRoundsByPlayer(player.id, month);
      
      const prevHandicap = player.currentHandicap;
      let newHandicap = prevHandicap;
      let avgMonthlyOverPar = null;
      let delta = 0;

      if (monthlyRounds.length > 0) {
        // Calculate average over par for the month
        const overParValues = monthlyRounds.map(round => parseFloat(round.overPar.toString()));
        avgMonthlyOverPar = calculateAverageOverPar(overParValues);
        
        // Calculate new handicap
        newHandicap = monthlyHandicapUpdate(avgMonthlyOverPar, prevHandicap, kFactor, changeCap);
        delta = newHandicap - prevHandicap;
        
        // Update player's current handicap
        await storage.updatePlayer(player.id, { currentHandicap: newHandicap });
        playersUpdated++;
      }

      // Create handicap snapshot
      const snapshot: InsertHandicapSnapshot = {
        playerId: player.id,
        month,
        prevHandicap,
        roundsCount: monthlyRounds.length,
        avgMonthlyOverPar: avgMonthlyOverPar?.toString() || null,
        delta: delta.toString(),
        newHandicap,
      };

      const createdSnapshot = await storage.createHandicapSnapshot(snapshot);
      snapshots.push({
        ...createdSnapshot,
        playerName: player.name,
      });
    }

    return {
      month,
      playersUpdated,
      snapshots,
    };
  }

  /**
   * Get previous month in YYYY-MM format
   */
  private getPreviousMonth(): string {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get monthly summary for sharing
   */
  async getMonthlyUpdateSummary(month: string): Promise<{
    month: string;
    snapshots: any[];
    summary: string;
  }> {
    const players = await storage.getAllPlayers();
    const snapshots = [];

    for (const player of players) {
      const snapshot = await storage.getHandicapSnapshotByMonth(player.id, month);
      if (snapshot) {
        snapshots.push({
          ...snapshot,
          playerName: player.name,
        });
      }
    }

    // Generate WhatsApp-friendly summary
    const summary = this.generateWhatsAppSummary(month, snapshots);

    return {
      month,
      snapshots,
      summary,
    };
  }

  /**
   * Generate WhatsApp summary text
   */
  private generateWhatsAppSummary(month: string, snapshots: any[]): string {
    const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });

    let summary = `🏌️ Blues Golf Challenge - ${monthName} Handicap Update\n\n`;
    
    snapshots.forEach(snapshot => {
      const direction = snapshot.delta > 0 ? '↗️' : snapshot.delta < 0 ? '↘️' : '➡️';
      const deltaStr = snapshot.delta > 0 ? `+${snapshot.delta}` : snapshot.delta.toString();
      
      summary += `${snapshot.playerName}: ${snapshot.prevHandicap} → ${snapshot.newHandicap} (${deltaStr}) ${direction}\n`;
      summary += `   ${snapshot.roundsCount} rounds, Avg: ${snapshot.avgMonthlyOverPar ? `+${parseFloat(snapshot.avgMonthlyOverPar).toFixed(1)}` : 'N/A'}\n\n`;
    });

    summary += '⛳ Keep playing and improving!';
    
    return summary;
  }
}

export const handicapService = new HandicapService();
