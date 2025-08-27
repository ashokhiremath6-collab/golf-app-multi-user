import {
  users,
  players,
  courses,
  holes,
  rounds,
  handicapSnapshots,
  monthlyLeaderboards,
  monthlyWinners,
  seasonSettings,
  type User,
  type UpsertUser,
  type Player,
  type InsertPlayer,
  type Course,
  type InsertCourse,
  type Hole,
  type InsertHole,
  type Round,
  type InsertRound,
  type HandicapSnapshot,
  type InsertHandicapSnapshot,
  type SeasonSettings,
  insertMonthlyLeaderboardSchema,
  insertMonthlyWinnerSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql, avg, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Player operations
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByEmail(email: string): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, player: Partial<InsertPlayer>): Promise<Player>;
  deletePlayer(id: string): Promise<void>;
  
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  getCourseByName(name: string): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Hole operations
  getHolesByCourse(courseId: string): Promise<Hole[]>;
  createHoles(holes: InsertHole[]): Promise<Hole[]>;
  updateHole(id: string, hole: Partial<InsertHole>): Promise<Hole>;
  deleteHolesByCourse(courseId: string): Promise<void>;
  
  // Round operations
  getRound(id: string): Promise<Round | undefined>;
  getRoundsByPlayer(playerId: string, month?: string): Promise<Round[]>;
  getAllRounds(month?: string): Promise<Round[]>;
  createRound(round: InsertRound): Promise<Round>;
  updateRound(id: string, round: Partial<InsertRound>): Promise<Round>;
  deleteRound(id: string): Promise<void>;
  
  // Handicap snapshot operations
  getHandicapSnapshots(playerId: string): Promise<HandicapSnapshot[]>;
  getHandicapSnapshotByMonth(playerId: string, month: string): Promise<HandicapSnapshot | undefined>;
  getAllHandicapSnapshots(): Promise<any[]>;
  createHandicapSnapshot(snapshot: InsertHandicapSnapshot): Promise<HandicapSnapshot>;
  
  // Leaderboard operations
  getLeaderboard(): Promise<any[]>;
  getMonthlyLeaderboard(month: string): Promise<any[]>;
  getCumulativeLeaderboard(): Promise<any[]>;
  
  // Monthly leaderboard history
  saveMonthlyLeaderboardSnapshot(month: string): Promise<void>;
  getLeaderboardHistory(): Promise<any[]>;
  getMonthlyLeaderboardSnapshot(month: string): Promise<any[]>;
  
  // Monthly winners
  getMonthlyWinners(): Promise<any[]>;
  getMonthlyWinner(month: string): Promise<any>;
  announceMonthlyWinner(winnerData: any): Promise<any>;
  
  // Player statistics
  getPlayerMonthlyStats(playerId: string, month: string): Promise<any>;
  getPlayerCumulativeStats(playerId: string): Promise<any>;
  
  // Season settings
  getSeasonSettings(): Promise<SeasonSettings>;
  updateSeasonSettings(settings: Partial<SeasonSettings>): Promise<SeasonSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Player operations
  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayerByEmail(email: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.email, email));
    return player;
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(asc(players.name));
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }

  async updatePlayer(id: string, player: Partial<InsertPlayer>): Promise<Player> {
    const [updated] = await db
      .update(players)
      .set(player)
      .where(eq(players.id, id))
      .returning();
    return updated;
  }

  async deletePlayer(id: string): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  // Course operations
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourseByName(name: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.name, name));
    return course;
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(asc(courses.name));
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(course).returning();
    return created;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course> {
    const [updated] = await db
      .update(courses)
      .set(course)
      .where(eq(courses.id, id))
      .returning();
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Hole operations
  async getHolesByCourse(courseId: string): Promise<Hole[]> {
    console.log("🏌️ STORAGE DEBUG - Course ID:", courseId);
    const result = await db
      .select()
      .from(holes)
      .where(eq(holes.courseId, courseId))
      .orderBy(asc(holes.number));
    console.log("🏌️ STORAGE DEBUG - Raw DB result:", result.slice(0, 5).map(h => ({hole: h.number, par: h.par})));
    return result;
  }

  async createHoles(holesData: InsertHole[]): Promise<Hole[]> {
    return await db.insert(holes).values(holesData).returning();
  }

  async updateHole(id: string, hole: Partial<InsertHole>): Promise<Hole> {
    const [updated] = await db
      .update(holes)
      .set(hole)
      .where(eq(holes.id, id))
      .returning();
    return updated;
  }

  async deleteHolesByCourse(courseId: string): Promise<void> {
    await db.delete(holes).where(eq(holes.courseId, courseId));
  }

  // Round operations
  async getRound(id: string): Promise<Round | undefined> {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }

  async getRoundsByPlayer(playerId: string, month?: string): Promise<Round[]> {
    if (month) {
      return await db
        .select()
        .from(rounds)
        .where(
          and(
            eq(rounds.playerId, playerId),
            sql`date_trunc('month', ${rounds.playedOn}) = ${month + '-01'}::date`
          )
        )
        .orderBy(desc(rounds.playedOn));
    }

    return await db
      .select()
      .from(rounds)
      .where(eq(rounds.playerId, playerId))
      .orderBy(desc(rounds.playedOn));
  }

  async getAllRounds(month?: string): Promise<Round[]> {
    if (month) {
      return await db
        .select()
        .from(rounds)
        .where(
          sql`date_trunc('month', ${rounds.playedOn}) = ${month + '-01'}::date`
        )
        .orderBy(desc(rounds.playedOn));
    }

    return await db
      .select()
      .from(rounds)
      .orderBy(desc(rounds.playedOn));
  }

  async createRound(round: InsertRound): Promise<Round> {
    const [created] = await db.insert(rounds).values(round as any).returning();
    return created;
  }

  async updateRound(id: string, round: Partial<InsertRound>): Promise<Round> {
    const [updated] = await db
      .update(rounds)
      .set(round)
      .where(eq(rounds.id, id))
      .returning();
    return updated;
  }

  async deleteRound(id: string): Promise<void> {
    await db.delete(rounds).where(eq(rounds.id, id));
  }

  // Handicap snapshot operations
  async getHandicapSnapshots(playerId: string): Promise<HandicapSnapshot[]> {
    return await db
      .select()
      .from(handicapSnapshots)
      .where(eq(handicapSnapshots.playerId, playerId))
      .orderBy(desc(handicapSnapshots.month));
  }

  async getHandicapSnapshotByMonth(playerId: string, month: string): Promise<HandicapSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(handicapSnapshots)
      .where(
        and(
          eq(handicapSnapshots.playerId, playerId),
          eq(handicapSnapshots.month, month)
        )
      );
    return snapshot;
  }

  async createHandicapSnapshot(snapshot: InsertHandicapSnapshot): Promise<HandicapSnapshot> {
    const [created] = await db.insert(handicapSnapshots).values(snapshot).returning();
    return created;
  }

  async getAllHandicapSnapshots(): Promise<any[]> {
    const result = await db
      .select({
        id: handicapSnapshots.id,
        playerId: handicapSnapshots.playerId,
        playerName: players.name,
        month: handicapSnapshots.month,
        prevHandicap: handicapSnapshots.prevHandicap,
        roundsCount: handicapSnapshots.roundsCount,
        avgMonthlyOverPar: handicapSnapshots.avgMonthlyOverPar,
        delta: handicapSnapshots.delta,
        newHandicap: handicapSnapshots.newHandicap,
        createdAt: handicapSnapshots.createdAt,
      })
      .from(handicapSnapshots)
      .leftJoin(players, eq(handicapSnapshots.playerId, players.id))
      .orderBy(desc(handicapSnapshots.createdAt));
    
    return result;
  }

  // Leaderboard operations
  async getLeaderboard(): Promise<any[]> {
    const result = await db
      .select({
        playerId: players.id,
        playerName: players.name,
        currentHandicap: players.currentHandicap,
        roundsCount: count(rounds.id),
        avgNet: avg(rounds.net),
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, eq(players.id, rounds.playerId))
      .groupBy(players.id, players.name, players.currentHandicap)
      .orderBy(asc(avg(rounds.net)));

    return result;
  }

  // Season settings
  async getSeasonSettings(): Promise<SeasonSettings> {
    const [settings] = await db.select().from(seasonSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist
      const [created] = await db.insert(seasonSettings).values({}).returning();
      return created;
    }
    return settings;
  }

  async updateSeasonSettings(settings: Partial<SeasonSettings>): Promise<SeasonSettings> {
    const [updated] = await db
      .update(seasonSettings)
      .set(settings)
      .where(eq(seasonSettings.id, 1))
      .returning();
    return updated;
  }

  async getGroupSettings(): Promise<SeasonSettings> {
    return this.getSeasonSettings();
  }

  async updateGroupSettings(settings: { groupName?: string }): Promise<SeasonSettings> {
    return this.updateSeasonSettings(settings);
  }

  // Monthly leaderboard operations
  async getMonthlyLeaderboard(month: string): Promise<any[]> {
    const result = await db
      .select({
        playerId: players.id,
        playerName: players.name,
        currentHandicap: players.currentHandicap,
        roundsCount: count(rounds.id),
        avgNet: avg(rounds.net),
        avgOverPar: avg(sql`CAST(${rounds.overPar} AS NUMERIC)`),
        avgGrossCapped: avg(rounds.grossCapped),
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, and(
        eq(players.id, rounds.playerId),
        sql`to_char(${rounds.playedOn}, 'YYYY-MM') = ${month}`
      ))
      .groupBy(players.id, players.name, players.currentHandicap)
      .having(sql`count(${rounds.id}) > 0`)
      .orderBy(asc(avg(rounds.net)));

    return result;
  }

  async getCumulativeLeaderboard(): Promise<any[]> {
    const result = await db
      .select({
        playerId: players.id,
        playerName: players.name,
        currentHandicap: players.currentHandicap,
        roundsCount: count(rounds.id),
        avgNet: avg(rounds.net),
        avgOverPar: avg(sql`CAST(${rounds.overPar} AS NUMERIC)`),
        avgGrossCapped: avg(rounds.grossCapped),
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, eq(players.id, rounds.playerId))
      .groupBy(players.id, players.name, players.currentHandicap)
      .having(sql`count(${rounds.id}) > 0`)
      .orderBy(asc(avg(rounds.net)));

    return result;
  }

  async saveMonthlyLeaderboardSnapshot(month: string): Promise<void> {
    const monthlyData = await this.getMonthlyLeaderboard(month);
    
    // Delete existing snapshot for the month
    await db.delete(monthlyLeaderboards).where(eq(monthlyLeaderboards.month, month));
    
    // Save new snapshot
    if (monthlyData.length > 0) {
      const snapshots = monthlyData.map((player: any, index: number) => ({
        playerId: player.playerId,
        month: month,
        playerName: player.playerName,
        roundsCount: Number(player.roundsCount),
        avgNet: player.avgNet,
        avgOverPar: player.avgOverPar,
        avgGrossCapped: player.avgGrossCapped,
        currentHandicap: player.currentHandicap,
        rank: index + 1,
        lastRoundDate: player.lastRoundDate,
        isFinalized: true,
      }));
      
      await db.insert(monthlyLeaderboards).values(snapshots);
    }
  }

  async getLeaderboardHistory(): Promise<any[]> {
    const result = await db
      .select({
        month: monthlyLeaderboards.month,
        playerCount: count(monthlyLeaderboards.id),
        avgRoundsPerPlayer: avg(monthlyLeaderboards.roundsCount),
        winner: sql<string>`(
          SELECT player_name FROM monthly_leaderboards ml2 
          WHERE ml2.month = ${monthlyLeaderboards.month} AND ml2.rank = 1 
          LIMIT 1
        )`,
        runnerUp: sql<string>`(
          SELECT player_name FROM monthly_leaderboards ml3 
          WHERE ml3.month = ${monthlyLeaderboards.month} AND ml3.rank = 2 
          LIMIT 1
        )`,
      })
      .from(monthlyLeaderboards)
      .where(eq(monthlyLeaderboards.isFinalized, true))
      .groupBy(monthlyLeaderboards.month)
      .orderBy(desc(monthlyLeaderboards.month));

    return result;
  }

  async getMonthlyLeaderboardSnapshot(month: string): Promise<any[]> {
    const result = await db
      .select()
      .from(monthlyLeaderboards)
      .where(and(
        eq(monthlyLeaderboards.month, month),
        eq(monthlyLeaderboards.isFinalized, true)
      ))
      .orderBy(asc(monthlyLeaderboards.rank));

    return result;
  }

  // Monthly winners operations
  async getMonthlyWinners(): Promise<any[]> {
    const result = await db
      .select({
        id: monthlyWinners.id,
        month: monthlyWinners.month,
        winnerId: monthlyWinners.winnerId,
        winnerName: monthlyWinners.winnerName,
        winnerScore: monthlyWinners.winnerScore,
        runnerUpId: monthlyWinners.runnerUpId,
        runnerUpName: monthlyWinners.runnerUpName,
        runnerUpScore: monthlyWinners.runnerUpScore,
        announcedAt: monthlyWinners.announcedAt,
        announcedBy: monthlyWinners.announcedBy,
      })
      .from(monthlyWinners)
      .orderBy(desc(monthlyWinners.month));

    return result;
  }

  async getMonthlyWinner(month: string): Promise<any> {
    const [result] = await db
      .select()
      .from(monthlyWinners)
      .where(eq(monthlyWinners.month, month))
      .limit(1);

    return result;
  }

  async announceMonthlyWinner(winnerData: any): Promise<any> {
    const [result] = await db
      .insert(monthlyWinners)
      .values(winnerData)
      .returning();

    return result;
  }

  // Player statistics
  async getPlayerMonthlyStats(playerId: string, month: string): Promise<any> {
    const [result] = await db
      .select({
        roundsCount: count(rounds.id),
        avgNet: avg(rounds.net),
        avgOverPar: avg(sql`CAST(${rounds.overPar} AS NUMERIC)`),
        avgGrossCapped: avg(rounds.grossCapped),
        bestNet: sql<number>`MIN(${rounds.net})`,
        worstNet: sql<number>`MAX(${rounds.net})`,
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(rounds)
      .where(and(
        eq(rounds.playerId, playerId),
        sql`to_char(${rounds.playedOn}, 'YYYY-MM') = ${month}`
      ));

    return result;
  }

  async getPlayerCumulativeStats(playerId: string): Promise<any> {
    const [result] = await db
      .select({
        roundsCount: count(rounds.id),
        avgNet: avg(rounds.net),
        avgOverPar: avg(sql`CAST(${rounds.overPar} AS NUMERIC)`),
        avgGrossCapped: avg(rounds.grossCapped),
        bestNet: sql<number>`MIN(${rounds.net})`,
        worstNet: sql<number>`MAX(${rounds.net})`,
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
        firstRoundDate: sql<string>`MIN(${rounds.playedOn})`,
      })
      .from(rounds)
      .where(eq(rounds.playerId, playerId));

    return result;
  }
}

export const storage = new DatabaseStorage();
