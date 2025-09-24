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
  organizations,
  organizationAdmins,
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
  type Organization,
  type InsertOrganization,
  type OrganizationAdmin,
  type InsertOrganizationAdmin,
  insertMonthlyLeaderboardSchema,
  insertMonthlyWinnerSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql, avg, count } from "drizzle-orm";
import { calculateSlopeAdjustedRound } from "./services/golfCalculations";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFromEmail(email: string): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;
  
  // Organization admin operations
  getOrganizationAdmins(organizationId: string): Promise<any[]>;
  addOrganizationAdmin(admin: InsertOrganizationAdmin): Promise<OrganizationAdmin>;
  removeOrganizationAdmin(organizationId: string, userId: string): Promise<void>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  isUserSuperAdmin(userId: string): Promise<boolean>;
  isUserOrganizationAdmin(userId: string, organizationId: string): Promise<boolean>;
  
  // Player operations (organization-scoped)
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByEmail(email: string): Promise<Player | undefined>;
  getAllPlayers(organizationId?: string): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, player: Partial<InsertPlayer>): Promise<Player>;
  deletePlayer(id: string): Promise<void>;
  
  // Course operations (organization-scoped)
  getCourse(id: string): Promise<Course | undefined>;
  getCourseByName(name: string, organizationId?: string): Promise<Course | undefined>;
  getAllCourses(organizationId?: string): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  copyCourseToOrganization(courseId: string, targetOrganizationId: string): Promise<Course>;
  
  // Hole operations
  getHolesByCourse(courseId: string): Promise<Hole[]>;
  createHoles(holes: InsertHole[]): Promise<Hole[]>;
  updateHole(id: string, hole: Partial<InsertHole>): Promise<Hole>;
  deleteHolesByCourse(courseId: string): Promise<void>;
  
  // Round operations
  getRound(id: string): Promise<Round | undefined>;
  getRoundsByPlayer(playerId: string, month?: string): Promise<any[]>;
  getAllRounds(month?: string): Promise<any[]>;
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
  
  // Season settings (organization-scoped)
  getSeasonSettings(organizationId?: string): Promise<SeasonSettings>;
  updateSeasonSettings(settings: Partial<SeasonSettings>, organizationId?: string): Promise<SeasonSettings>;
  createSeasonSettingsForOrganization(organizationId: string): Promise<SeasonSettings>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserFromEmail(email: string): Promise<User> {
    // Extract first name from email (part before @)
    const emailPart = email.split('@')[0];
    const firstName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    
    const userData = {
      email,
      firstName,
      lastName: '', // Default empty last name
      profileImageUrl: null,
      replit: {
        id: `temp_${Date.now()}`, // Temporary ID, will be replaced if user logs in via Replit
        username: emailPart,
      },
    };

    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(asc(organizations.name));
  }

  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(orgData).returning();
    
    // Create default season settings for the new organization
    await this.createSeasonSettingsForOrganization(org.id);
    
    return org;
  }

  async updateOrganization(id: string, orgData: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set({ ...orgData, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    // Note: This should cascade delete related data based on foreign key constraints
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // Organization admin operations
  async getOrganizationAdmins(organizationId: string): Promise<any[]> {
    return await db
      .select({
        id: organizationAdmins.id,
        organizationId: organizationAdmins.organizationId,
        userId: organizationAdmins.userId,
        userEmail: users.email,
        userName: users.email,
        createdAt: organizationAdmins.createdAt,
      })
      .from(organizationAdmins)
      .leftJoin(users, eq(organizationAdmins.userId, users.id))
      .where(eq(organizationAdmins.organizationId, organizationId))
      .orderBy(asc(users.email));
  }

  async addOrganizationAdmin(adminData: InsertOrganizationAdmin): Promise<OrganizationAdmin> {
    const [admin] = await db.insert(organizationAdmins).values(adminData).returning();
    return admin;
  }

  async removeOrganizationAdmin(organizationId: string, userId: string): Promise<void> {
    await db
      .delete(organizationAdmins)
      .where(
        and(
          eq(organizationAdmins.organizationId, organizationId),
          eq(organizationAdmins.userId, userId)
        )
      );
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    return await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        isParent: organizations.isParent,
        createdById: organizations.createdById,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizationAdmins)
      .leftJoin(organizations, eq(organizationAdmins.organizationId, organizations.id))
      .where(eq(organizationAdmins.userId, userId))
      .orderBy(asc(organizations.name)) as Organization[];
  }

  async isUserSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isSuperAdmin || false;
  }

  async isUserOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    const [admin] = await db
      .select()
      .from(organizationAdmins)
      .where(
        and(
          eq(organizationAdmins.userId, userId),
          eq(organizationAdmins.organizationId, organizationId)
        )
      );
    return !!admin;
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

  async getAllPlayers(organizationId?: string): Promise<Player[]> {
    if (organizationId) {
      return await db
        .select()
        .from(players)
        .where(eq(players.organizationId, organizationId))
        .orderBy(asc(players.name));
    }
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

  async getCourseByName(name: string, organizationId?: string): Promise<Course | undefined> {
    if (organizationId) {
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.name, name), eq(courses.organizationId, organizationId)));
      return course;
    }
    const [course] = await db.select().from(courses).where(eq(courses.name, name));
    return course;
  }

  async getAllCourses(organizationId?: string): Promise<Course[]> {
    if (organizationId) {
      return await db
        .select()
        .from(courses)
        .where(eq(courses.organizationId, organizationId))
        .orderBy(asc(courses.name));
    }
    return await db.select().from(courses).orderBy(asc(courses.name));
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(course).returning();
    
    // Automatically create 18 holes with default par values for the new course
    const defaultHoles: InsertHole[] = Array.from({ length: 18 }, (_, i) => {
      // Default par layout: mix of par 3s, 4s, and 5s
      const defaultPars = [4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5];
      return {
        courseId: created.id,
        number: i + 1,
        par: defaultPars[i],
        distance: 400, // Default distance
      };
    });
    
    await this.createHoles(defaultHoles);
    
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

  async copyCourseToOrganization(courseId: string, targetOrganizationId: string): Promise<Course> {
    // Get the source course and its holes
    const sourceCourse = await this.getCourse(courseId);
    if (!sourceCourse) {
      throw new Error("Source course not found");
    }

    const sourceHoles = await this.getHolesByCourse(courseId);

    // Create new course for target organization
    const { id: _, organizationId: __, createdAt: ___, ...courseData } = sourceCourse;
    const newCourse = await this.createCourse({
      ...courseData,
      organizationId: targetOrganizationId,
      rating: courseData.rating || undefined,
      slope: courseData.slope || undefined,
    });

    // Copy holes if they exist
    if (sourceHoles.length > 0) {
      // First, delete the auto-created holes from createCourse
      await this.deleteHolesByCourse(newCourse.id);
      
      // Create holes with same configuration as source
      const newHoles = sourceHoles.map(hole => ({
        courseId: newCourse.id,
        number: hole.number,
        par: hole.par,
        distance: hole.distance,
      }));
      
      await this.createHoles(newHoles);
    }

    return newCourse;
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

  async getRoundsByPlayer(playerId: string, month?: string): Promise<any[]> {
    let rawRounds;
    
    if (month) {
      rawRounds = await db
        .select({
          id: rounds.id,
          playerId: rounds.playerId,
          courseId: rounds.courseId,
          playedOn: rounds.playedOn,
          rawScores: rounds.rawScores,
          cappedScores: rounds.cappedScores,
          grossCapped: rounds.grossCapped,
          courseHandicap: rounds.courseHandicap,
          net: rounds.net,
          overPar: rounds.overPar,
          source: rounds.source,
          status: rounds.status,
          createdAt: rounds.createdAt,
          courseName: courses.name,
          course: {
            name: courses.name,
            tees: courses.tees,
            slope: courses.slope,
          },
        })
        .from(rounds)
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(
          and(
            eq(rounds.playerId, playerId),
            sql`date_trunc('month', ${rounds.playedOn}) = ${month + '-01'}::date`
          )
        )
        .orderBy(desc(rounds.playedOn));
    } else {
      rawRounds = await db
        .select({
          id: rounds.id,
          playerId: rounds.playerId,
          courseId: rounds.courseId,
          playedOn: rounds.playedOn,
          rawScores: rounds.rawScores,
          cappedScores: rounds.cappedScores,
          grossCapped: rounds.grossCapped,
          courseHandicap: rounds.courseHandicap,
          net: rounds.net,
          overPar: rounds.overPar,
          source: rounds.source,
          status: rounds.status,
          createdAt: rounds.createdAt,
          courseName: courses.name,
          course: {
            name: courses.name,
            tees: courses.tees,
            slope: courses.slope,
          },
        })
        .from(rounds)
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(eq(rounds.playerId, playerId))
        .orderBy(desc(rounds.playedOn));
    }

    // Add slope-adjusted calculations to each round
    return rawRounds.map(round => {
      if (round.course?.slope && round.courseHandicap !== undefined && round.overPar !== undefined) {
        const slopeAdjustments = calculateSlopeAdjustedRound(
          parseFloat(round.overPar.toString()),
          parseFloat(round.courseHandicap.toString()),
          parseFloat(round.course.slope.toString())
        );
        
        return {
          ...round,
          slopeAdjustedCourseHandicap: slopeAdjustments.slopeAdjustedCourseHandicap,
          slopeAdjustedDTH: slopeAdjustments.slopeAdjustedDTH,
          handicapIndex: slopeAdjustments.handicapIndex,
          normalizedOverPar: slopeAdjustments.normalizedOverPar,
        };
      }
      
      // Fallback for rounds without slope data
      return {
        ...round,
        slopeAdjustedCourseHandicap: round.courseHandicap,
        slopeAdjustedDTH: round.overPar ? parseFloat(round.overPar.toString()) - round.courseHandicap : 0,
        handicapIndex: null,
        normalizedOverPar: round.overPar,
      };
    });
  }

  async getAllRounds(month?: string): Promise<any[]> {
    if (month) {
      return await db
        .select({
          id: rounds.id,
          playerId: rounds.playerId,
          courseId: rounds.courseId,
          playedOn: rounds.playedOn,
          rawScores: rounds.rawScores,
          cappedScores: rounds.cappedScores,
          grossCapped: rounds.grossCapped,
          courseHandicap: rounds.courseHandicap,
          net: rounds.net,
          overPar: rounds.overPar,
          source: rounds.source,
          status: rounds.status,
          createdAt: rounds.createdAt,
          courseName: courses.name,
          course: {
            name: courses.name,
            tees: courses.tees,
            slope: courses.slope,
          },
        })
        .from(rounds)
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(
          sql`date_trunc('month', ${rounds.playedOn}) = ${month + '-01'}::date`
        )
        .orderBy(desc(rounds.playedOn));
    }

    return await db
      .select({
        id: rounds.id,
        playerId: rounds.playerId,
        courseId: rounds.courseId,
        playedOn: rounds.playedOn,
        rawScores: rounds.rawScores,
        cappedScores: rounds.cappedScores,
        grossCapped: rounds.grossCapped,
        courseHandicap: rounds.courseHandicap,
        net: rounds.net,
        overPar: rounds.overPar,
        source: rounds.source,
        status: rounds.status,
        createdAt: rounds.createdAt,
        courseName: courses.name,
        course: {
          name: courses.name,
          tees: courses.tees,
          slope: courses.slope,
        },
      })
      .from(rounds)
      .leftJoin(courses, eq(rounds.courseId, courses.id))
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
        avgOverPar: avg(rounds.overPar),
        avgDTH: sql<number>`
          AVG(CASE 
            WHEN ${courses.slope} IS NOT NULL THEN 
              ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
            ELSE 
              ${rounds.overPar} - ${rounds.courseHandicap}
            END)
        `,
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, eq(players.id, rounds.playerId))
      .leftJoin(courses, eq(rounds.courseId, courses.id))
      .groupBy(players.id, players.name, players.currentHandicap)
      .orderBy(sql`
        AVG(CASE 
          WHEN ${courses.slope} IS NOT NULL THEN 
            ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          ELSE 
            ${rounds.overPar} - ${rounds.courseHandicap}
          END) ASC NULLS LAST
      `);

    return result;
  }

  // Season settings (organization-scoped)
  async getSeasonSettings(organizationId?: string): Promise<SeasonSettings> {
    if (organizationId) {
      const [settings] = await db
        .select()
        .from(seasonSettings)
        .where(eq(seasonSettings.organizationId, organizationId))
        .limit(1);
      
      if (!settings) {
        // Create default settings for this organization if none exist
        return await this.createSeasonSettingsForOrganization(organizationId);
      }
      return settings;
    }
    
    // Fallback for backward compatibility - get first settings record
    const [settings] = await db.select().from(seasonSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist (this shouldn't happen in multi-tenant)
      const [created] = await db.insert(seasonSettings).values({}).returning();
      return created;
    }
    return settings;
  }

  async updateSeasonSettings(settings: Partial<SeasonSettings>, organizationId?: string): Promise<SeasonSettings> {
    if (organizationId) {
      // Find the settings for this organization
      const existingSettings = await this.getSeasonSettings(organizationId);
      const [updated] = await db
        .update(seasonSettings)
        .set(settings)
        .where(eq(seasonSettings.id, existingSettings.id))
        .returning();
      return updated;
    }
    
    // Fallback for backward compatibility
    const [updated] = await db
      .update(seasonSettings)
      .set(settings)
      .where(eq(seasonSettings.id, 1))
      .returning();
    return updated;
  }

  async createSeasonSettingsForOrganization(organizationId: string): Promise<SeasonSettings> {
    const [created] = await db
      .insert(seasonSettings)
      .values({
        organizationId,
        groupName: 'Blues Golf Challenge', // Default name, can be updated
        seasonEnd: '2026-03-31',
        leaderboardMetric: 'avg_over_par',
        kFactor: '0.5',
        changeCap: '2.0',
      })
      .returning();
    return created;
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
        avgDTH: sql<number>`
          AVG(CASE 
            WHEN ${courses.slope} IS NOT NULL THEN 
              ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
            ELSE 
              ${rounds.overPar} - ${rounds.courseHandicap}
            END)
        `,
        avgGrossCapped: avg(rounds.grossCapped),
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, and(
        eq(players.id, rounds.playerId),
        sql`to_char(${rounds.playedOn}, 'YYYY-MM') = ${month}`
      ))
      .leftJoin(courses, eq(rounds.courseId, courses.id))
      .groupBy(players.id, players.name, players.currentHandicap)
      .having(sql`count(${rounds.id}) > 0`)
      .orderBy(sql`
        AVG(CASE 
          WHEN ${courses.slope} IS NOT NULL THEN 
            ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          ELSE 
            ${rounds.overPar} - ${rounds.courseHandicap}
          END) ASC NULLS LAST
      `);

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
        avgDTH: sql<number>`
          AVG(CASE 
            WHEN ${courses.slope} IS NOT NULL THEN 
              ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
            ELSE 
              ${rounds.overPar} - ${rounds.courseHandicap}
            END)
        `,
        avgGrossCapped: avg(rounds.grossCapped),
        lastRoundDate: sql<string>`MAX(${rounds.playedOn})`,
      })
      .from(players)
      .leftJoin(rounds, eq(players.id, rounds.playerId))
      .leftJoin(courses, eq(rounds.courseId, courses.id))
      .groupBy(players.id, players.name, players.currentHandicap)
      .having(sql`count(${rounds.id}) > 0`)
      .orderBy(sql`
        AVG(CASE 
          WHEN ${courses.slope} IS NOT NULL THEN 
            ${rounds.overPar} - ROUND((${players.currentHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          ELSE 
            ${rounds.overPar} - ${rounds.courseHandicap}
          END) ASC NULLS LAST
      `);

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
        avgDTH: sql<number>`AVG(${rounds.overPar} - ${rounds.courseHandicap})`,
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
        avgDTH: sql<number>`AVG(${rounds.overPar} - ${rounds.courseHandicap})`,
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
