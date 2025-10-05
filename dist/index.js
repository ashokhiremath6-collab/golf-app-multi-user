var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/golfCalculations.ts
var golfCalculations_exports = {};
__export(golfCalculations_exports, {
  calculateAverageOverPar: () => calculateAverageOverPar,
  calculateCourseHandicap: () => calculateCourseHandicap,
  calculateHandicapIndex: () => calculateHandicapIndex,
  calculateNormalizedOverPar: () => calculateNormalizedOverPar,
  calculateRoundScores: () => calculateRoundScores,
  calculateSlopeAdjustedDTH: () => calculateSlopeAdjustedDTH,
  calculateSlopeAdjustedRound: () => calculateSlopeAdjustedRound,
  capPerHole: () => capPerHole,
  computeGrossCapped: () => computeGrossCapped,
  computeNet: () => computeNet,
  computeOverPar: () => computeOverPar,
  monthlyHandicapUpdate: () => monthlyHandicapUpdate
});
function capPerHole(rawScore, par) {
  return Math.min(rawScore, par + 2);
}
function computeGrossCapped(cappedScores) {
  return cappedScores.reduce((sum, score) => sum + score, 0);
}
function computeNet(grossCapped, courseHandicap) {
  return grossCapped - courseHandicap;
}
function computeOverPar(grossCapped, courseParTotal) {
  return grossCapped - courseParTotal;
}
function calculateRoundScores(rawScores, holePars, courseHandicap, courseParTotal) {
  if (rawScores.length !== 18 || holePars.length !== 18) {
    throw new Error("Must provide exactly 18 hole scores and pars");
  }
  const cappedScores = rawScores.map(
    (score, index2) => capPerHole(score, holePars[index2])
  );
  const grossCapped = computeGrossCapped(cappedScores);
  const net = computeNet(grossCapped, courseHandicap);
  const overPar = computeOverPar(grossCapped, courseParTotal);
  return {
    rawScores,
    cappedScores,
    grossCapped,
    net,
    overPar
  };
}
function monthlyHandicapUpdate(avgMonthlyOverPar, previousHandicap, kFactor = 0.3, changeCap = 2) {
  const newHandicapUnclamped = kFactor * avgMonthlyOverPar + (1 - kFactor) * previousHandicap;
  const delta = newHandicapUnclamped - previousHandicap;
  const clampedDelta = Math.max(-changeCap, Math.min(changeCap, delta));
  const newHandicapClamped = previousHandicap + clampedDelta;
  const newHandicapFloored = Math.max(0, newHandicapClamped);
  const decimalPart = newHandicapFloored - Math.floor(newHandicapFloored);
  if (decimalPart < 0.5) {
    return Math.floor(newHandicapFloored);
  } else {
    return Math.ceil(newHandicapFloored);
  }
}
function calculateAverageOverPar(overParValues) {
  if (overParValues.length === 0) return 0;
  const sum = overParValues.reduce((acc, val) => acc + val, 0);
  return sum / overParValues.length;
}
function calculateHandicapIndex(willingdonHandicap) {
  return willingdonHandicap * 113 / 110;
}
function calculateCourseHandicap(handicapIndex, slopeRating) {
  return Math.round(handicapIndex * slopeRating / 113);
}
function calculateSlopeAdjustedDTH(overPar, slopeAdjustedCourseHandicap) {
  return overPar - slopeAdjustedCourseHandicap;
}
function calculateNormalizedOverPar(overPar, handicapIndex, courseSlopeRating) {
  const courseHandicap = calculateCourseHandicap(handicapIndex, courseSlopeRating);
  const willingdonHandicap = calculateCourseHandicap(handicapIndex, 110);
  return overPar - (courseHandicap - willingdonHandicap);
}
function calculateSlopeAdjustedRound(overPar, willingdonHandicap, courseSlopeRating) {
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
var init_golfCalculations = __esm({
  "server/services/golfCalculations.ts"() {
    "use strict";
  }
});

// server/services/emailService.ts
var emailService_exports = {};
__export(emailService_exports, {
  EmailService: () => EmailService,
  emailService: () => emailService
});
import { Resend } from "resend";
var resend, EmailService, emailService;
var init_emailService = __esm({
  "server/services/emailService.ts"() {
    "use strict";
    resend = new Resend(process.env.RESEND_API_KEY);
    EmailService = class {
      fromEmail = "onboarding@resend.dev";
      // Default Resend test email
      /**
       * Send handicap change notification to a player
       */
      async sendHandicapChangeNotification(data) {
        const {
          playerName,
          playerEmail,
          month,
          prevHandicap,
          newHandicap,
          delta,
          roundsPlayed
        } = data;
        const trend = delta > 0 ? "increased" : delta < 0 ? "decreased" : "remained the same";
        const trendEmoji = delta > 0 ? "\u{1F4C8}" : delta < 0 ? "\u{1F4C9}" : "\u27A1\uFE0F";
        const changeText = delta !== 0 ? `${Math.abs(delta)} ${delta > 0 ? "up" : "down"}` : "no change";
        const subject = `${trendEmoji} Your Golf Handicap Update - ${month}`;
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .stat-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .handicap-change {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
    }
    .handicap-item {
      text-align: center;
    }
    .handicap-number {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }
    .old { color: #999; }
    .new { color: #667eea; }
    .arrow {
      font-size: 36px;
      color: #764ba2;
      align-self: center;
    }
    .summary {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>\u26F3 Handicap Update</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">${month}</p>
  </div>
  
  <div class="content">
    <p>Hi ${playerName},</p>
    <p>Your monthly handicap has been recalculated based on your performance in ${month}.</p>
    
    <div class="handicap-change">
      <div class="handicap-item">
        <div class="stat-label">Previous</div>
        <div class="handicap-number old">${prevHandicap}</div>
      </div>
      <div class="arrow">${trendEmoji}</div>
      <div class="handicap-item">
        <div class="stat-label">New</div>
        <div class="handicap-number new">${newHandicap}</div>
      </div>
    </div>
    
    <div class="summary">
      <strong>Summary:</strong> Your handicap ${trend} by <strong>${changeText}</strong> based on ${roundsPlayed} round${roundsPlayed !== 1 ? "s" : ""} played in ${month}.
    </div>
    
    <div class="stat-box">
      <div class="stat-label">Rounds Played</div>
      <div class="stat-value">${roundsPlayed}</div>
    </div>
    
    ${delta !== 0 ? `
    <p style="margin-top: 30px;">
      ${delta > 0 ? "Keep practicing! Your handicap increased this month, but every round is an opportunity to improve." : "Great job! Your handicap decreased this month. Keep up the excellent play!"}
    </p>
    ` : `
    <p style="margin-top: 30px;">
      Your handicap remained stable this month. ${roundsPlayed > 0 ? "Consistent performance!" : "Play more rounds next month to see changes."}
    </p>
    `}
    
    <p>Keep playing and tracking your rounds to see your progress over time!</p>
    
    <div style="text-align: center; margin-top: 30px;">
      <p>View your detailed stats and history in the app.</p>
    </div>
  </div>
  
  <div class="footer">
    <p>This is an automated monthly handicap notification from Blues Golf Challenge</p>
    <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Blues Golf Challenge</p>
  </div>
</body>
</html>
    `;
        const textContent = `
Hi ${playerName},

Your monthly handicap has been recalculated for ${month}.

Previous Handicap: ${prevHandicap}
New Handicap: ${newHandicap}
Change: ${changeText}
Rounds Played: ${roundsPlayed}

Your handicap ${trend} based on your performance this month.

${delta > 0 ? "Keep practicing! Your handicap increased this month, but every round is an opportunity to improve." : delta < 0 ? "Great job! Your handicap decreased this month. Keep up the excellent play!" : "Your handicap remained stable this month."}

Keep playing and tracking your rounds to see your progress over time!

---
Blues Golf Challenge
This is an automated monthly handicap notification.
    `;
        try {
          await resend.emails.send({
            from: this.fromEmail,
            to: playerEmail,
            subject,
            html: htmlContent,
            text: textContent
          });
          console.log(`\u2705 Handicap notification sent to ${playerEmail}`);
        } catch (error) {
          console.error(`\u274C Failed to send email to ${playerEmail}:`, error);
          throw error;
        }
      }
      /**
       * Send bulk handicap notifications (for monthly recalculation)
       */
      async sendBulkHandicapNotifications(notifications) {
        let sent = 0;
        let failed = 0;
        const errors = [];
        console.log(`\u{1F4E7} Sending ${notifications.length} handicap notifications...`);
        for (const notification of notifications) {
          try {
            await this.sendHandicapChangeNotification(notification);
            sent++;
          } catch (error) {
            failed++;
            errors.push({
              email: notification.playerEmail,
              error: error.message || "Unknown error"
            });
          }
        }
        console.log(`\u2705 Email notifications complete: ${sent} sent, ${failed} failed`);
        return { sent, failed, errors };
      }
      /**
       * Set custom from email (if you have a verified domain)
       */
      setFromEmail(email) {
        this.fromEmail = email;
      }
    };
    emailService = new EmailService();
  }
});

// server/index.ts
import express2 from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  courses: () => courses,
  coursesRelations: () => coursesRelations,
  handicapSnapshots: () => handicapSnapshots,
  handicapSnapshotsRelations: () => handicapSnapshotsRelations,
  holes: () => holes,
  holesRelations: () => holesRelations,
  insertCourseSchema: () => insertCourseSchema,
  insertHandicapSnapshotSchema: () => insertHandicapSnapshotSchema,
  insertHoleSchema: () => insertHoleSchema,
  insertMonthlyLeaderboardSchema: () => insertMonthlyLeaderboardSchema,
  insertMonthlyWinnerSchema: () => insertMonthlyWinnerSchema,
  insertOrganizationAdminSchema: () => insertOrganizationAdminSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPlayerSchema: () => insertPlayerSchema,
  insertRoundSchema: () => insertRoundSchema,
  monthlyLeaderboards: () => monthlyLeaderboards,
  monthlyLeaderboardsRelations: () => monthlyLeaderboardsRelations,
  monthlyWinners: () => monthlyWinners,
  monthlyWinnersRelations: () => monthlyWinnersRelations,
  organizationAdmins: () => organizationAdmins,
  organizationAdminsRelations: () => organizationAdminsRelations,
  organizations: () => organizations,
  organizationsRelations: () => organizationsRelations,
  players: () => players,
  playersRelations: () => playersRelations,
  rounds: () => rounds,
  roundsRelations: () => roundsRelations,
  seasonSettings: () => seasonSettings,
  sessions: () => sessions,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  check
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  // URL-friendly identifier
  isParent: boolean("is_parent").default(false),
  // True for the main "Blues Golf Challenge" organization
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var organizationAdmins = pgTable("organization_admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var players = pgTable("players", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  // Nullable for existing data
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  currentHandicap: integer("current_handicap").notNull().default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  // Nullable for existing data
  name: text("name").notNull(),
  tees: text("tees").default("Blue"),
  parTotal: integer("par_total").notNull(),
  rating: numeric("rating"),
  slope: numeric("slope"),
  createdAt: timestamp("created_at").defaultNow()
});
var holes = pgTable("holes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  number: integer("number").notNull(),
  par: integer("par").notNull(),
  distance: integer("distance")
}, (table) => [
  check("hole_number_valid", sql`${table.number} >= 1 AND ${table.number} <= 18`)
]);
var rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  playedOn: date("played_on").notNull(),
  rawScores: integer("raw_scores").array().notNull(),
  cappedScores: integer("capped_scores").array().notNull(),
  grossCapped: integer("gross_capped").notNull(),
  courseHandicap: integer("course_handicap").notNull(),
  net: integer("net").notNull(),
  overPar: numeric("over_par").notNull(),
  source: text("source", { enum: ["app", "admin", "import", "whatsapp"] }).default("app"),
  status: text("status", { enum: ["ok", "needs_review"] }).default("ok"),
  createdAt: timestamp("created_at").defaultNow()
});
var handicapSnapshots = pgTable("handicap_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  month: text("month").notNull(),
  // YYYY-MM format
  prevHandicap: integer("prev_handicap").notNull(),
  roundsCount: integer("rounds_count").notNull(),
  avgMonthlyOverPar: numeric("avg_monthly_over_par"),
  delta: numeric("delta").notNull(),
  newHandicap: integer("new_handicap").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var monthlyLeaderboards = pgTable("monthly_leaderboards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  month: text("month").notNull(),
  // YYYY-MM format
  playerName: text("player_name").notNull(),
  roundsCount: integer("rounds_count").notNull(),
  avgNet: numeric("avg_net").notNull(),
  avgOverPar: numeric("avg_over_par").notNull(),
  avgGrossCapped: numeric("avg_gross_capped").notNull(),
  currentHandicap: integer("current_handicap").notNull(),
  rank: integer("rank").notNull(),
  lastRoundDate: date("last_round_date").notNull(),
  isFinalized: boolean("is_finalized").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var monthlyWinners = pgTable("monthly_winners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(),
  // YYYY-MM format
  winnerId: uuid("winner_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  winnerName: text("winner_name").notNull(),
  winnerScore: numeric("winner_score").notNull(),
  runnerUpId: uuid("runner_up_id").references(() => players.id, { onDelete: "set null" }),
  runnerUpName: text("runner_up_name"),
  runnerUpScore: numeric("runner_up_score"),
  announcedAt: timestamp("announced_at").defaultNow(),
  announcedBy: uuid("announced_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow()
});
var seasonSettings = pgTable("season_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  // Nullable for existing data
  groupName: text("group_name").default("Blues Golf Challenge"),
  seasonEnd: date("season_end").default("2026-03-31"),
  leaderboardMetric: text("leaderboard_metric").default("avg_over_par"),
  kFactor: numeric("k_factor").default("0.5"),
  changeCap: numeric("change_cap").default("2.0")
});
var organizationsRelations = relations(organizations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [organizations.createdById],
    references: [users.id]
  }),
  admins: many(organizationAdmins),
  players: many(players),
  courses: many(courses),
  seasonSettings: many(seasonSettings)
}));
var organizationAdminsRelations = relations(organizationAdmins, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationAdmins.organizationId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [organizationAdmins.userId],
    references: [users.id]
  })
}));
var usersRelations = relations(users, ({ many }) => ({
  createdOrganizations: many(organizations),
  organizationAdmins: many(organizationAdmins)
}));
var playersRelations = relations(players, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [players.organizationId],
    references: [organizations.id]
  }),
  rounds: many(rounds),
  handicapSnapshots: many(handicapSnapshots),
  monthlyLeaderboards: many(monthlyLeaderboards),
  monthlyWins: many(monthlyWinners, { relationName: "winner" }),
  monthlyRunnerUps: many(monthlyWinners, { relationName: "runnerUp" })
}));
var coursesRelations = relations(courses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [courses.organizationId],
    references: [organizations.id]
  }),
  holes: many(holes),
  rounds: many(rounds)
}));
var holesRelations = relations(holes, ({ one }) => ({
  course: one(courses, {
    fields: [holes.courseId],
    references: [courses.id]
  })
}));
var roundsRelations = relations(rounds, ({ one }) => ({
  player: one(players, {
    fields: [rounds.playerId],
    references: [players.id]
  }),
  course: one(courses, {
    fields: [rounds.courseId],
    references: [courses.id]
  })
}));
var handicapSnapshotsRelations = relations(handicapSnapshots, ({ one }) => ({
  player: one(players, {
    fields: [handicapSnapshots.playerId],
    references: [players.id]
  })
}));
var monthlyLeaderboardsRelations = relations(monthlyLeaderboards, ({ one }) => ({
  player: one(players, {
    fields: [monthlyLeaderboards.playerId],
    references: [players.id]
  })
}));
var monthlyWinnersRelations = relations(monthlyWinners, ({ one }) => ({
  winner: one(players, {
    fields: [monthlyWinners.winnerId],
    references: [players.id],
    relationName: "winner"
  }),
  runnerUp: one(players, {
    fields: [monthlyWinners.runnerUpId],
    references: [players.id],
    relationName: "runnerUp"
  }),
  announcedByPlayer: one(players, {
    fields: [monthlyWinners.announcedBy],
    references: [players.id],
    relationName: "announcer"
  })
}));
var insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdById: true,
  // Backend automatically sets this from authenticated user
  createdAt: true,
  updatedAt: true
});
var insertOrganizationAdminSchema = createInsertSchema(organizationAdmins).omit({
  id: true,
  organizationId: true,
  // Backend automatically sets this from URL parameter
  createdAt: true
});
var insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true
});
var insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true
}).extend({
  // Fix numeric fields to accept numbers instead of strings
  rating: z.union([z.number(), z.string()]).transform((val) => val?.toString()).optional(),
  slope: z.union([z.number(), z.string()]).transform((val) => val?.toString()).optional()
});
var insertHoleSchema = createInsertSchema(holes).omit({
  id: true
});
var insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  cappedScores: true,
  grossCapped: true,
  net: true,
  overPar: true
});
var insertMonthlyLeaderboardSchema = createInsertSchema(monthlyLeaderboards).omit({
  id: true,
  createdAt: true
});
var insertMonthlyWinnerSchema = createInsertSchema(monthlyWinners).omit({
  id: true,
  createdAt: true,
  announcedAt: true
});
var insertHandicapSnapshotSchema = createInsertSchema(handicapSnapshots).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
init_golfCalculations();
import { eq, desc, asc, and, sql as sql2, avg, count } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUserFromEmail(email) {
    const emailPart = email.split("@")[0];
    const firstName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    const userData = {
      email,
      firstName,
      lastName: "",
      // Default empty last name
      profileImageUrl: null,
      replit: {
        id: `temp_${Date.now()}`,
        // Temporary ID, will be replaced if user logs in via Replit
        username: emailPart
      }
    };
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  // Organization operations
  async getOrganization(id) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }
  async getOrganizationBySlug(slug) {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }
  async getAllOrganizations() {
    return await db.select().from(organizations).orderBy(asc(organizations.name));
  }
  async createOrganization(orgData) {
    const [org] = await db.insert(organizations).values(orgData).returning();
    await this.createSeasonSettingsForOrganization(org.id);
    return org;
  }
  async updateOrganization(id, orgData) {
    const [updated] = await db.update(organizations).set({ ...orgData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(organizations.id, id)).returning();
    return updated;
  }
  async deleteOrganization(id) {
    await db.delete(organizations).where(eq(organizations.id, id));
  }
  // Organization admin operations
  async getOrganizationAdmins(organizationId) {
    return await db.select({
      id: organizationAdmins.id,
      organizationId: organizationAdmins.organizationId,
      userId: organizationAdmins.userId,
      userEmail: users.email,
      userName: users.email,
      createdAt: organizationAdmins.createdAt
    }).from(organizationAdmins).leftJoin(users, eq(organizationAdmins.userId, users.id)).where(eq(organizationAdmins.organizationId, organizationId)).orderBy(asc(users.email));
  }
  async addOrganizationAdmin(adminData) {
    const [admin] = await db.insert(organizationAdmins).values(adminData).returning();
    return admin;
  }
  async removeOrganizationAdmin(organizationId, userId) {
    await db.delete(organizationAdmins).where(
      and(
        eq(organizationAdmins.organizationId, organizationId),
        eq(organizationAdmins.userId, userId)
      )
    );
  }
  async getUserOrganizations(userId) {
    return await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      isParent: organizations.isParent,
      createdById: organizations.createdById,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt
    }).from(organizationAdmins).leftJoin(organizations, eq(organizationAdmins.organizationId, organizations.id)).where(eq(organizationAdmins.userId, userId)).orderBy(asc(organizations.name));
  }
  async getUserAccessibleOrganizations(userId) {
    const user = await this.getUser(userId);
    if (!user) return [];
    if (user.isSuperAdmin) {
      return await this.getAllOrganizations();
    }
    const adminOrgs = await this.getUserOrganizations(userId);
    const playerOrgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      isParent: organizations.isParent,
      createdById: organizations.createdById,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt
    }).from(players).leftJoin(organizations, eq(players.organizationId, organizations.id)).where(eq(players.email, user.email || "")).orderBy(asc(organizations.name));
    const orgMap = /* @__PURE__ */ new Map();
    [...adminOrgs, ...playerOrgs].forEach((org) => {
      if (org && org.id) {
        orgMap.set(org.id, org);
      }
    });
    return Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  async isUserSuperAdmin(userId) {
    const user = await this.getUser(userId);
    return user?.isSuperAdmin || false;
  }
  async isUserOrganizationAdmin(userId, organizationId) {
    const [admin] = await db.select().from(organizationAdmins).where(
      and(
        eq(organizationAdmins.userId, userId),
        eq(organizationAdmins.organizationId, organizationId)
      )
    );
    return !!admin;
  }
  // Player operations
  async getPlayer(id) {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }
  async getPlayerByEmail(email) {
    const [player] = await db.select().from(players).where(eq(players.email, email));
    return player;
  }
  async getPlayerByUserIdAndOrganization(userId, organizationId) {
    const user = await this.getUser(userId);
    if (!user?.email) return void 0;
    const [player] = await db.select().from(players).where(
      and(
        eq(players.email, user.email),
        eq(players.organizationId, organizationId)
      )
    ).orderBy(asc(players.createdAt)).limit(1);
    return player;
  }
  async getAllPlayers(organizationId) {
    if (organizationId) {
      return await db.select().from(players).where(eq(players.organizationId, organizationId)).orderBy(asc(players.name));
    }
    return await db.select().from(players).orderBy(asc(players.name));
  }
  async createPlayer(player) {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }
  async updatePlayer(id, player) {
    const [updated] = await db.update(players).set(player).where(eq(players.id, id)).returning();
    return updated;
  }
  async deletePlayer(id) {
    await db.delete(players).where(eq(players.id, id));
  }
  // Course operations
  async getCourse(id) {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }
  async getCourseByName(name, organizationId) {
    if (organizationId) {
      const [course2] = await db.select().from(courses).where(and(eq(courses.name, name), eq(courses.organizationId, organizationId)));
      return course2;
    }
    const [course] = await db.select().from(courses).where(eq(courses.name, name));
    return course;
  }
  async getAllCourses(organizationId) {
    if (organizationId) {
      return await db.select().from(courses).where(eq(courses.organizationId, organizationId)).orderBy(asc(courses.name));
    }
    return await db.select().from(courses).orderBy(asc(courses.name));
  }
  async createCourse(course) {
    const [created] = await db.insert(courses).values(course).returning();
    const defaultHoles = Array.from({ length: 18 }, (_, i) => {
      const defaultPars = [4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5];
      return {
        courseId: created.id,
        number: i + 1,
        par: defaultPars[i],
        distance: 400
        // Default distance
      };
    });
    await this.createHoles(defaultHoles);
    return created;
  }
  async updateCourse(id, course) {
    const [updated] = await db.update(courses).set(course).where(eq(courses.id, id)).returning();
    return updated;
  }
  async deleteCourse(id) {
    await db.delete(courses).where(eq(courses.id, id));
  }
  async copyCourseToOrganization(courseId, targetOrganizationId) {
    const sourceCourse = await this.getCourse(courseId);
    if (!sourceCourse) {
      throw new Error("Source course not found");
    }
    const sourceHoles = await this.getHolesByCourse(courseId);
    const { id: _, organizationId: __, createdAt: ___, ...courseData } = sourceCourse;
    const newCourse = await this.createCourse({
      ...courseData,
      organizationId: targetOrganizationId,
      rating: courseData.rating || void 0,
      slope: courseData.slope || void 0
    });
    if (sourceHoles.length > 0) {
      await this.deleteHolesByCourse(newCourse.id);
      const newHoles = sourceHoles.map((hole) => ({
        courseId: newCourse.id,
        number: hole.number,
        par: hole.par,
        distance: hole.distance
      }));
      await this.createHoles(newHoles);
    }
    return newCourse;
  }
  // Hole operations
  async getHolesByCourse(courseId) {
    console.log("\u{1F3CC}\uFE0F STORAGE DEBUG - Course ID:", courseId);
    const result = await db.select().from(holes).where(eq(holes.courseId, courseId)).orderBy(asc(holes.number));
    console.log("\u{1F3CC}\uFE0F STORAGE DEBUG - Raw DB result:", result.slice(0, 5).map((h) => ({ hole: h.number, par: h.par })));
    return result;
  }
  async createHoles(holesData) {
    return await db.insert(holes).values(holesData).returning();
  }
  async updateHole(id, hole) {
    const [updated] = await db.update(holes).set(hole).where(eq(holes.id, id)).returning();
    return updated;
  }
  async deleteHolesByCourse(courseId) {
    await db.delete(holes).where(eq(holes.courseId, courseId));
  }
  // Round operations
  async getRound(id) {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }
  async getRoundsByPlayer(playerId, month, organizationId) {
    let rawRounds;
    if (month) {
      let whereConditions = [
        eq(rounds.playerId, playerId),
        sql2`date_trunc('month', ${rounds.playedOn}) = ${month + "-01"}::date`
      ];
      if (organizationId) {
        whereConditions.push(eq(players.organizationId, organizationId));
      }
      rawRounds = await db.select({
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
          slope: courses.slope
        }
      }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id)).leftJoin(players, eq(rounds.playerId, players.id)).where(and(...whereConditions)).orderBy(desc(rounds.playedOn));
    } else {
      let whereConditions = [eq(rounds.playerId, playerId)];
      if (organizationId) {
        whereConditions.push(eq(players.organizationId, organizationId));
      }
      rawRounds = await db.select({
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
          slope: courses.slope
        }
      }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id)).leftJoin(players, eq(rounds.playerId, players.id)).where(and(...whereConditions)).orderBy(desc(rounds.playedOn));
    }
    return rawRounds.map((round) => {
      if (round.course?.slope && round.courseHandicap !== void 0 && round.overPar !== void 0) {
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
          normalizedOverPar: slopeAdjustments.normalizedOverPar
        };
      }
      return {
        ...round,
        slopeAdjustedCourseHandicap: round.courseHandicap,
        slopeAdjustedDTH: round.overPar ? parseFloat(round.overPar.toString()) - round.courseHandicap : 0,
        handicapIndex: null,
        normalizedOverPar: round.overPar
      };
    });
  }
  async getAllRounds(month, organizationId) {
    if (month) {
      let whereConditions = [sql2`date_trunc('month', ${rounds.playedOn}) = ${month + "-01"}::date`];
      if (organizationId) {
        whereConditions.push(eq(players.organizationId, organizationId));
      }
      let query2 = db.select({
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
          slope: courses.slope
        }
      }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id));
      if (organizationId) {
        query2 = query2.leftJoin(players, eq(rounds.playerId, players.id));
      }
      if (whereConditions.length > 0) {
        query2 = query2.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions));
      }
      return await query2.orderBy(desc(rounds.playedOn));
    }
    let query = db.select({
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
        slope: courses.slope
      }
    }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id));
    if (organizationId) {
      query = query.leftJoin(players, eq(rounds.playerId, players.id));
      query = query.where(eq(players.organizationId, organizationId));
    }
    return await query.orderBy(desc(rounds.playedOn));
  }
  async createRound(round) {
    const [created] = await db.insert(rounds).values(round).returning();
    return created;
  }
  async updateRound(id, round) {
    const [updated] = await db.update(rounds).set(round).where(eq(rounds.id, id)).returning();
    return updated;
  }
  async deleteRound(id) {
    await db.delete(rounds).where(eq(rounds.id, id));
  }
  // Handicap snapshot operations
  async getHandicapSnapshots(playerId) {
    return await db.select().from(handicapSnapshots).where(eq(handicapSnapshots.playerId, playerId)).orderBy(desc(handicapSnapshots.month));
  }
  async getHandicapSnapshotByMonth(playerId, month) {
    const [snapshot] = await db.select().from(handicapSnapshots).where(
      and(
        eq(handicapSnapshots.playerId, playerId),
        eq(handicapSnapshots.month, month)
      )
    );
    return snapshot;
  }
  async createHandicapSnapshot(snapshot) {
    const [created] = await db.insert(handicapSnapshots).values(snapshot).returning();
    return created;
  }
  async getAllHandicapSnapshots(organizationId) {
    let query = db.select({
      id: handicapSnapshots.id,
      playerId: handicapSnapshots.playerId,
      playerName: players.name,
      month: handicapSnapshots.month,
      prevHandicap: handicapSnapshots.prevHandicap,
      roundsCount: handicapSnapshots.roundsCount,
      avgMonthlyOverPar: handicapSnapshots.avgMonthlyOverPar,
      delta: handicapSnapshots.delta,
      newHandicap: handicapSnapshots.newHandicap,
      createdAt: handicapSnapshots.createdAt
    }).from(handicapSnapshots).leftJoin(players, eq(handicapSnapshots.playerId, players.id));
    if (organizationId) {
      query = query.where(eq(players.organizationId, organizationId));
    }
    const result = await query.orderBy(desc(handicapSnapshots.createdAt));
    return result;
  }
  // Leaderboard operations
  async getLeaderboard(organizationId) {
    let query = db.select({
      playerId: players.id,
      playerName: players.name,
      currentHandicap: players.currentHandicap,
      roundsCount: count(rounds.id),
      avgNet: avg(rounds.net),
      avgOverPar: avg(rounds.overPar),
      avgDTH: sql2`
          AVG(
            ${rounds.overPar} - 
            ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          )
        `,
      lastRoundDate: sql2`MAX(${rounds.playedOn})`
    }).from(players).leftJoin(rounds, eq(players.id, rounds.playerId)).leftJoin(courses, eq(rounds.courseId, courses.id));
    if (organizationId) {
      query = query.where(eq(players.organizationId, organizationId));
    }
    const result = await query.groupBy(players.id, players.name, players.currentHandicap).orderBy(sql2`
        AVG(
          ${rounds.overPar} - 
          ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
        ) ASC NULLS LAST
      `);
    return result;
  }
  // Season settings (organization-scoped)
  async getSeasonSettings(organizationId) {
    if (organizationId) {
      const [settings2] = await db.select().from(seasonSettings).where(eq(seasonSettings.organizationId, organizationId)).limit(1);
      if (!settings2) {
        return await this.createSeasonSettingsForOrganization(organizationId);
      }
      return settings2;
    }
    const [settings] = await db.select().from(seasonSettings).limit(1);
    if (!settings) {
      const [created] = await db.insert(seasonSettings).values({}).returning();
      return created;
    }
    return settings;
  }
  async updateSeasonSettings(settings, organizationId) {
    if (organizationId) {
      const existingSettings = await this.getSeasonSettings(organizationId);
      const [updated2] = await db.update(seasonSettings).set(settings).where(eq(seasonSettings.id, existingSettings.id)).returning();
      return updated2;
    }
    const [updated] = await db.update(seasonSettings).set(settings).where(eq(seasonSettings.id, 1)).returning();
    return updated;
  }
  async createSeasonSettingsForOrganization(organizationId) {
    const [created] = await db.insert(seasonSettings).values({
      organizationId,
      groupName: "Blues Golf Challenge",
      // Default name, can be updated
      seasonEnd: "2026-03-31",
      leaderboardMetric: "avg_over_par",
      kFactor: "0.5",
      changeCap: "2.0"
    }).returning();
    return created;
  }
  async getGroupSettings() {
    return this.getSeasonSettings();
  }
  async updateGroupSettings(settings) {
    return this.updateSeasonSettings(settings);
  }
  // Monthly leaderboard operations
  async getMonthlyLeaderboard(month) {
    const result = await db.select({
      playerId: players.id,
      playerName: players.name,
      currentHandicap: players.currentHandicap,
      roundsCount: count(rounds.id),
      avgNet: avg(rounds.net),
      avgOverPar: avg(sql2`CAST(${rounds.overPar} AS NUMERIC)`),
      avgDTH: sql2`
          AVG(
            ${rounds.overPar} - 
            ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          )
        `,
      avgGrossCapped: avg(rounds.grossCapped),
      lastRoundDate: sql2`MAX(${rounds.playedOn})`
    }).from(players).leftJoin(rounds, and(
      eq(players.id, rounds.playerId),
      sql2`to_char(${rounds.playedOn}, 'YYYY-MM') = ${month}`
    )).leftJoin(courses, eq(rounds.courseId, courses.id)).groupBy(players.id, players.name, players.currentHandicap).having(sql2`count(${rounds.id}) > 0`).orderBy(sql2`
        AVG(
          ${rounds.overPar} - 
          ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
        ) ASC NULLS LAST
      `);
    return result;
  }
  async getCumulativeLeaderboard() {
    const result = await db.select({
      playerId: players.id,
      playerName: players.name,
      currentHandicap: players.currentHandicap,
      roundsCount: count(rounds.id),
      avgNet: avg(rounds.net),
      avgOverPar: avg(sql2`CAST(${rounds.overPar} AS NUMERIC)`),
      avgDTH: sql2`
          AVG(
            ${rounds.overPar} - 
            ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          )
        `,
      avgGrossCapped: avg(rounds.grossCapped),
      lastRoundDate: sql2`MAX(${rounds.playedOn})`
    }).from(players).leftJoin(rounds, eq(players.id, rounds.playerId)).leftJoin(courses, eq(rounds.courseId, courses.id)).groupBy(players.id, players.name, players.currentHandicap).having(sql2`count(${rounds.id}) > 0`).orderBy(sql2`
        AVG(
          ${rounds.overPar} - 
          ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
        ) ASC NULLS LAST
      `);
    return result;
  }
  async saveMonthlyLeaderboardSnapshot(month) {
    const monthlyData = await this.getMonthlyLeaderboard(month);
    await db.delete(monthlyLeaderboards).where(eq(monthlyLeaderboards.month, month));
    if (monthlyData.length > 0) {
      const snapshots = monthlyData.map((player, index2) => ({
        playerId: player.playerId,
        month,
        playerName: player.playerName,
        roundsCount: Number(player.roundsCount),
        avgNet: player.avgNet,
        avgOverPar: player.avgOverPar,
        avgGrossCapped: player.avgGrossCapped,
        currentHandicap: player.currentHandicap,
        rank: index2 + 1,
        lastRoundDate: player.lastRoundDate,
        isFinalized: true
      }));
      await db.insert(monthlyLeaderboards).values(snapshots);
    }
  }
  async getLeaderboardHistory() {
    const result = await db.select({
      month: monthlyLeaderboards.month,
      playerCount: count(monthlyLeaderboards.id),
      avgRoundsPerPlayer: avg(monthlyLeaderboards.roundsCount),
      winner: sql2`(
          SELECT player_name FROM monthly_leaderboards ml2 
          WHERE ml2.month = ${monthlyLeaderboards.month} AND ml2.rank = 1 
          LIMIT 1
        )`,
      runnerUp: sql2`(
          SELECT player_name FROM monthly_leaderboards ml3 
          WHERE ml3.month = ${monthlyLeaderboards.month} AND ml3.rank = 2 
          LIMIT 1
        )`
    }).from(monthlyLeaderboards).where(eq(monthlyLeaderboards.isFinalized, true)).groupBy(monthlyLeaderboards.month).orderBy(desc(monthlyLeaderboards.month));
    return result;
  }
  async getMonthlyLeaderboardSnapshot(month) {
    const result = await db.select().from(monthlyLeaderboards).where(and(
      eq(monthlyLeaderboards.month, month),
      eq(monthlyLeaderboards.isFinalized, true)
    )).orderBy(asc(monthlyLeaderboards.rank));
    return result;
  }
  // Monthly winners operations
  async getMonthlyWinners() {
    const result = await db.select({
      id: monthlyWinners.id,
      month: monthlyWinners.month,
      winnerId: monthlyWinners.winnerId,
      winnerName: monthlyWinners.winnerName,
      winnerScore: monthlyWinners.winnerScore,
      runnerUpId: monthlyWinners.runnerUpId,
      runnerUpName: monthlyWinners.runnerUpName,
      runnerUpScore: monthlyWinners.runnerUpScore,
      announcedAt: monthlyWinners.announcedAt,
      announcedBy: monthlyWinners.announcedBy
    }).from(monthlyWinners).orderBy(desc(monthlyWinners.month));
    return result;
  }
  async getMonthlyWinner(month) {
    const [result] = await db.select().from(monthlyWinners).where(eq(monthlyWinners.month, month)).limit(1);
    return result;
  }
  async announceMonthlyWinner(winnerData) {
    const [result] = await db.insert(monthlyWinners).values(winnerData).returning();
    return result;
  }
  // Player statistics
  async getPlayerMonthlyStats(playerId, month) {
    const [result] = await db.select({
      roundsCount: count(rounds.id),
      avgNet: avg(rounds.net),
      avgOverPar: avg(sql2`CAST(${rounds.overPar} AS NUMERIC)`),
      avgDTH: sql2`
          AVG(
            ${rounds.overPar} - 
            ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          )
        `,
      avgGrossCapped: avg(rounds.grossCapped),
      bestNet: sql2`MIN(${rounds.net})`,
      worstNet: sql2`MAX(${rounds.net})`,
      lastRoundDate: sql2`MAX(${rounds.playedOn})`
    }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id)).where(and(
      eq(rounds.playerId, playerId),
      sql2`to_char(${rounds.playedOn}, 'YYYY-MM') = ${month}`
    ));
    return result;
  }
  async getPlayerCumulativeStats(playerId) {
    const [result] = await db.select({
      roundsCount: count(rounds.id),
      avgNet: avg(rounds.net),
      avgOverPar: avg(sql2`CAST(${rounds.overPar} AS NUMERIC)`),
      avgDTH: sql2`
          AVG(
            ${rounds.overPar} - 
            ROUND((${rounds.courseHandicap} * 113.0 / 110.0) * ${courses.slope} / 113.0)
          )
        `,
      avgGrossCapped: avg(rounds.grossCapped),
      bestNet: sql2`MIN(${rounds.net})`,
      worstNet: sql2`MAX(${rounds.net})`,
      lastRoundDate: sql2`MAX(${rounds.playedOn})`,
      firstRoundDate: sql2`MIN(${rounds.playedOn})`
    }).from(rounds).leftJoin(courses, eq(rounds.courseId, courses.id)).where(eq(rounds.playerId, playerId));
    return result;
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/services/handicapService.ts
init_golfCalculations();
init_emailService();
var HandicapService = class {
  /**
   * Run handicap recalculation for a specific month or previous month
   */
  async runMonthlyRecalculation(targetMonth, sendEmails = true) {
    const month = targetMonth || this.getPreviousMonth();
    const players2 = await storage.getAllPlayers();
    const seasonSettings2 = await storage.getSeasonSettings();
    const kFactor = parseFloat(seasonSettings2.kFactor?.toString() || "0.3");
    const changeCap = parseFloat(seasonSettings2.changeCap?.toString() || "2.0");
    const snapshots = [];
    let playersUpdated = 0;
    for (const player of players2) {
      const existingSnapshot = await storage.getHandicapSnapshotByMonth(
        player.id,
        month
      );
      if (existingSnapshot) {
        continue;
      }
      const monthlyRounds = await storage.getRoundsByPlayer(player.id, month);
      const prevHandicap = player.currentHandicap;
      let newHandicap = prevHandicap;
      let avgMonthlyOverPar = null;
      let delta = 0;
      if (monthlyRounds.length > 0) {
        const overParValues = monthlyRounds.map(
          (round) => parseFloat(round.overPar.toString())
        );
        avgMonthlyOverPar = calculateAverageOverPar(overParValues);
        newHandicap = monthlyHandicapUpdate(avgMonthlyOverPar, prevHandicap, kFactor, changeCap);
        delta = newHandicap - prevHandicap;
        await storage.updatePlayer(player.id, { currentHandicap: newHandicap });
        playersUpdated++;
      }
      const snapshot = {
        playerId: player.id,
        month,
        prevHandicap,
        roundsCount: monthlyRounds.length,
        avgMonthlyOverPar: avgMonthlyOverPar?.toString() || null,
        delta: delta.toString(),
        newHandicap
      };
      const createdSnapshot = await storage.createHandicapSnapshot(snapshot);
      snapshots.push({
        ...createdSnapshot,
        playerName: player.name,
        playerEmail: player.email
      });
    }
    let emailsSent = 0;
    let emailsFailed = 0;
    if (sendEmails && snapshots.length > 0) {
      console.log(`\u{1F4E7} Sending handicap update emails for ${month}...`);
      const emailNotifications = snapshots.filter((s) => s.playerEmail).map((s) => ({
        playerName: s.playerName,
        playerEmail: s.playerEmail,
        month,
        prevHandicap: parseFloat(s.prevHandicap.toString()),
        newHandicap: parseFloat(s.newHandicap.toString()),
        delta: parseFloat(s.delta.toString()),
        roundsPlayed: s.roundsCount
      }));
      const emailResult = await emailService.sendBulkHandicapNotifications(emailNotifications);
      emailsSent = emailResult.sent;
      emailsFailed = emailResult.failed;
      if (emailResult.errors.length > 0) {
        console.error("Email errors:", emailResult.errors);
      }
    }
    return {
      month,
      playersUpdated,
      snapshots,
      emailsSent,
      emailsFailed
    };
  }
  /**
   * Get previous month in YYYY-MM format
   */
  getPreviousMonth() {
    const now = /* @__PURE__ */ new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  }
  /**
   * Get monthly summary for sharing
   */
  async getMonthlyUpdateSummary(month) {
    const players2 = await storage.getAllPlayers();
    const snapshots = [];
    for (const player of players2) {
      const snapshot = await storage.getHandicapSnapshotByMonth(
        player.id,
        month
      );
      if (snapshot) {
        snapshots.push({
          ...snapshot,
          playerName: player.name
        });
      }
    }
    const summary = this.generateWhatsAppSummary(month, snapshots);
    return {
      month,
      snapshots,
      summary
    };
  }
  /**
   * Generate WhatsApp summary text
   */
  generateWhatsAppSummary(month, snapshots) {
    const monthName = (/* @__PURE__ */ new Date(month + "-01")).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long"
    });
    let summary = `\u{1F3CC}\uFE0F Blues Golf Challenge - ${monthName} Handicap Update

`;
    snapshots.forEach((snapshot) => {
      const direction = snapshot.delta > 0 ? "\u2197\uFE0F" : snapshot.delta < 0 ? "\u2198\uFE0F" : "\u27A1\uFE0F";
      const deltaStr = snapshot.delta > 0 ? `+${snapshot.delta}` : snapshot.delta.toString();
      summary += `${snapshot.playerName}: ${snapshot.prevHandicap} \u2192 ${snapshot.newHandicap} (${deltaStr}) ${direction}
`;
      summary += `   ${snapshot.roundsCount} rounds, Avg: ${snapshot.avgMonthlyOverPar ? `+${parseFloat(snapshot.avgMonthlyOverPar).toFixed(1)}` : "N/A"}

`;
    });
    summary += "\u26F3 Keep playing and improving!";
    return summary;
  }
};
var handicapService = new HandicapService();

// server/services/importService.ts
var ImportService = class {
  /**
   * Import rounds from CSV data
   */
  async importRounds(csvData, options = { autoCreatePlayers: false, autoCreateCourses: false }) {
    const result = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      summary: {
        playersCreated: 0,
        coursesCreated: 0,
        roundsImported: 0
      }
    };
    for (let i = 0; i < csvData.length; i++) {
      try {
        const rowData = csvData[i];
        const rowNumber = i + 1;
        if (!rowData.player_name || !rowData.course_name || !rowData.played_on || rowData.course_handicap === void 0) {
          result.errors.push(`Row ${rowNumber}: Missing required fields (player_name, course_name, played_on, course_handicap)`);
          result.skipped++;
          continue;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.played_on)) {
          result.errors.push(`Row ${rowNumber}: Invalid date format. Use YYYY-MM-DD`);
          result.skipped++;
          continue;
        }
        for (let hole = 1; hole <= 18; hole++) {
          const scoreKey = `scores_${hole}`;
          const score = rowData[scoreKey];
          if (typeof score !== "number" || score < 1 || score > 10) {
            result.errors.push(`Row ${rowNumber}: Invalid score for hole ${hole}: ${score}. Must be between 1 and 10.`);
            result.skipped++;
            continue;
          }
        }
        if (rowData.course_handicap < 0 || rowData.course_handicap > 54) {
          result.errors.push(`Row ${rowNumber}: Invalid course handicap. Must be between 0 and 54`);
          result.skipped++;
          continue;
        }
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
              isAdmin: false
            });
            result.summary.playersCreated++;
          } else {
            result.errors.push(`Row ${rowNumber}: Player '${rowData.player_name}' not found`);
            result.skipped++;
            continue;
          }
        }
        let course = await storage.getCourseByName(rowData.course_name);
        if (!course) {
          if (options.autoCreateCourses) {
            course = await storage.createCourse({
              name: rowData.course_name,
              tees: "Blue",
              parTotal: 72
              // Default par - admin can update later
            });
            result.summary.coursesCreated++;
            const defaultHoles = Array.from({ length: 18 }, (_, index2) => ({
              courseId: course.id,
              number: index2 + 1,
              par: 4,
              distance: 400
            }));
            await storage.createHoles(defaultHoles);
          } else {
            result.errors.push(`Row ${rowNumber}: Course '${rowData.course_name}' not found`);
            result.skipped++;
            continue;
          }
        }
        if (!course) {
          result.errors.push(`Row ${rowNumber}: Course not found after creation/lookup`);
          result.skipped++;
          continue;
        }
        const holes2 = await storage.getHolesByCourse(course.id);
        if (holes2.length !== 18) {
          result.errors.push(`Row ${rowNumber}: Course '${rowData.course_name}' does not have 18 holes configured`);
          result.skipped++;
          continue;
        }
        const rawScores = [];
        for (let hole = 1; hole <= 18; hole++) {
          const scoreKey = `scores_${hole}`;
          const score = rowData[scoreKey];
          if (typeof score !== "number" || score < 1 || score > 10) {
            throw new Error(`Invalid score for hole ${hole}: ${score}. Must be between 1 and 10.`);
          }
          rawScores.push(score);
        }
        const holePars = holes2.map((hole) => hole.par);
        const { calculateRoundScores: calculateRoundScores2 } = await Promise.resolve().then(() => (init_golfCalculations(), golfCalculations_exports));
        const scoreCalculation = calculateRoundScores2(
          rawScores,
          holePars,
          rowData.course_handicap,
          course.parTotal
        );
        if (!player) {
          result.errors.push(`Row ${rowNumber}: Player not found after creation/lookup`);
          result.skipped++;
          continue;
        }
        const roundData = {
          playerId: player.id,
          courseId: course.id,
          playedOn: rowData.played_on,
          rawScores: scoreCalculation.rawScores,
          cappedScores: scoreCalculation.cappedScores,
          grossCapped: scoreCalculation.grossCapped,
          courseHandicap: rowData.course_handicap,
          net: scoreCalculation.net,
          overPar: scoreCalculation.overPar.toString(),
          source: "import",
          status: "ok"
        };
        await storage.createRound(roundData);
        result.imported++;
        result.summary.roundsImported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        result.skipped++;
        result.success = false;
      }
    }
    return result;
  }
  /**
   * Parse CSV text to ImportRoundData array
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have header row and at least one data row");
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, index2) => {
        const value = values[index2];
        if (header === "course_handicap" || header.startsWith("scores_")) {
          row[header] = parseInt(value, 10);
        } else if (header === "played_on") {
          row[header] = value;
        } else {
          row[header] = value;
        }
      });
      data.push(row);
    }
    return data;
  }
  /**
   * Find player by name (fuzzy matching)
   */
  async findPlayerByName(name) {
    const players2 = await storage.getAllPlayers();
    return players2.find(
      (p) => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase())
    );
  }
  /**
   * Generate sample CSV format
   */
  getSampleCSV() {
    return `player_name,course_name,played_on,gross_score,course_handicap
Ashok Hiremath,Willingdon Golf Club,2024-12-28,85,16
Dev Bhattacharya,BPGC,2024-12-26,78,13
Debashish Das,US Club,2024-12-30,92,14`;
  }
};
var importService = new ImportService();

// server/routes.ts
init_golfCalculations();
import { z as z2 } from "zod";

// server/previewMode.ts
function isPreviewMode() {
  return process.env.PREVIEW_MODE === "true";
}
function redactPII(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactPII(item));
  }
  if (typeof obj === "object") {
    const redacted = { ...obj };
    if (redacted.email && typeof redacted.email === "string") {
      const emailParts = redacted.email.split("@");
      if (emailParts.length === 2) {
        const [username, domain] = emailParts;
        redacted.email = `${username.substring(0, 2)}***@${domain}`;
      }
    }
    Object.keys(redacted).forEach((key) => {
      if (typeof redacted[key] === "object") {
        redacted[key] = redactPII(redacted[key]);
      }
    });
    return redacted;
  }
  return obj;
}
function createPreviewResponse(data) {
  if (isPreviewMode()) {
    return redactPII(data);
  }
  return data;
}

// server/routes.ts
import jwt from "jsonwebtoken";
var createPlayerRoundSchema = z2.object({
  courseId: z2.string().uuid(),
  playedOn: z2.string(),
  // Date string in YYYY-MM-DD format
  rawScores: z2.array(z2.number().min(1).max(10)).length(18),
  courseHandicap: z2.number().optional(),
  // Optional - backend will calculate if not provided
  organizationId: z2.string().uuid(),
  // Required for organization context
  source: z2.enum(["app", "admin", "import", "whatsapp"]).optional(),
  status: z2.enum(["ok", "needs_review"]).optional()
});
var createAdminRoundSchema = insertRoundSchema.extend({
  rawScores: z2.array(z2.number().min(1).max(10)).length(18),
  courseHandicap: z2.number().optional()
  // Optional - backend will calculate if not provided
});
var importRoundsSchema = z2.object({
  csvData: z2.string(),
  autoCreatePlayers: z2.boolean().default(false),
  autoCreateCourses: z2.boolean().default(false)
});
var handicapRecalcSchema = z2.object({
  window: z2.enum(["previous", "current", "specific"]),
  month: z2.string().optional()
});
var mapPlayerForAPI = (player) => {
  const { currentHandicap, ...rest } = player;
  return {
    ...rest,
    handicap: currentHandicap,
    currentHandicap
    // Keep both for backwards compatibility
  };
};
var isPreviewWriteBlocked = (req, res, next) => {
  if (isPreviewMode() && req.method !== "GET") {
    const adminRoutes = [
      "/api/courses",
      "/api/holes",
      "/api/players",
      "/api/rounds",
      "/api/import",
      "/api/handicaps"
    ];
    const isAdminRoute = adminRoutes.some((route) => req.path.startsWith(route));
    if (!isAdminRoute) {
      return res.status(403).json({ message: "Preview mode: write operations disabled" });
    }
  }
  next();
};
var ORG_SESSION_SECRET = process.env.ORG_SESSION_SECRET || "your-org-session-secret-key";
var ORG_SESSION_EXPIRY = "2h";
var checkReplitSession = (req) => {
  try {
    return !!req.session?.passport?.user?.claims?.sub;
  } catch (error) {
    return false;
  }
};
var nonRedirectingAuth = async (req, res, next) => {
  if (checkReplitSession(req)) {
    req.user = req.session.passport.user;
    return next();
  }
  return res.status(401).json({
    message: "Authentication required",
    code: "AUTH_REQUIRED",
    redirectToLogin: true
  });
};
var enhancedAuth = async (req, res, next) => {
  const orgToken = req.cookies?.orgToken || req.headers["x-org-token"];
  if (orgToken) {
    try {
      const decoded = jwt.verify(orgToken, ORG_SESSION_SECRET);
      const orgId = req.params.organizationId || req.params.id || req.path.split("/")[3];
      if (decoded.orgId === orgId && decoded.exp > Date.now() / 1e3) {
        req.orgSession = decoded;
        req.user = { claims: { sub: decoded.userId, email: decoded.email } };
        return next();
      }
    } catch (error) {
      return res.status(401).json({
        message: "Organization session expired",
        code: "ORG_TOKEN_EXPIRED",
        requiresRefresh: true
      });
    }
  }
  if (checkReplitSession(req)) {
    req.user = req.session?.passport?.user ?? { claims: { sub: "replit-session" } };
    return next();
  }
  return res.status(401).json({
    message: "Authentication required",
    code: "AUTH_REQUIRED",
    redirectToLogin: true
  });
};
async function registerRoutes(app2) {
  app2.get("/api/preview/status", (req, res) => {
    res.json({ preview: isPreviewMode() });
  });
  app2.use(isPreviewWriteBlocked);
  if (!isPreviewMode()) {
    await setupAuth(app2);
  }
  app2.get("/api/auth/user", async (req, res) => {
    if (isPreviewMode()) {
      return res.json(null);
    }
    const hasReplitSession = checkReplitSession(req);
    const orgToken = req.cookies?.orgToken || req.headers["x-org-token"];
    let hasValidOrgToken = false;
    if (orgToken) {
      try {
        const decoded = jwt.verify(orgToken, ORG_SESSION_SECRET);
        hasValidOrgToken = decoded.exp > Date.now() / 1e3;
      } catch (error) {
        hasValidOrgToken = false;
      }
    }
    if (!hasReplitSession && !hasValidOrgToken) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        redirectToLogin: true
      });
    }
    if (hasReplitSession) {
      req.user = req.session?.passport?.user ?? { claims: { sub: "replit-session" } };
    } else if (hasValidOrgToken) {
      const decoded = jwt.verify(orgToken, ORG_SESSION_SECRET);
      req.user = { claims: { sub: decoded.userId, email: decoded.email } };
    }
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const user = await storage.getUser(userId);
      const player = await storage.getPlayerByEmail(userEmail);
      const response = {
        ...user,
        linkedPlayer: player || null,
        isLinkedToPlayer: !!player
      };
      res.json(createPreviewResponse(response));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  if (isPreviewMode()) {
    app2.get("/api/login", (req, res) => {
      res.status(200).json({ message: "Preview mode: auth disabled" });
    });
    app2.get("/api/logout", (req, res) => {
      res.status(200).json({ message: "Preview mode: auth disabled" });
    });
  }
  app2.post("/api/organizations/:id/session", nonRedirectingAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      const player = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin && !player) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      const orgSessionData = {
        userId,
        email: userEmail,
        orgId: organizationId,
        orgSlug: organization.slug,
        isAdmin: isSuperAdmin || isOrgAdmin,
        playerId: player?.id || null,
        iat: Math.floor(Date.now() / 1e3),
        exp: Math.floor(Date.now() / 1e3) + 2 * 60 * 60
        // 2 hours
      };
      const orgToken = jwt.sign(orgSessionData, ORG_SESSION_SECRET, { expiresIn: ORG_SESSION_EXPIRY });
      res.cookie("orgToken", orgToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1e3
        // 2 hours
      });
      res.json({
        success: true,
        sessionData: {
          orgId: organizationId,
          orgSlug: organization.slug,
          orgName: organization.name,
          isAdmin: orgSessionData.isAdmin,
          playerId: orgSessionData.playerId,
          expiresAt: orgSessionData.exp * 1e3
        }
      });
    } catch (error) {
      console.error("Error creating organization session:", error);
      res.status(500).json({ message: "Failed to create organization session" });
    }
  });
  app2.delete("/api/organizations/:id/session", (req, res) => {
    res.clearCookie("orgToken");
    res.json({ success: true, message: "Organization session cleared" });
  });
  app2.get("/api/organizations/:id/session/verify", enhancedAuth, async (req, res) => {
    try {
      const organizationId = req.params.id;
      if (req.orgSession) {
        res.json({
          valid: true,
          sessionData: {
            orgId: req.orgSession.orgId,
            orgSlug: req.orgSession.orgSlug,
            isAdmin: req.orgSession.isAdmin,
            playerId: req.orgSession.playerId,
            expiresAt: req.orgSession.exp * 1e3
          }
        });
      } else {
        res.json({ valid: false, message: "No valid organization session" });
      }
    } catch (error) {
      console.error("Error verifying organization session:", error);
      res.status(500).json({ message: "Failed to verify organization session" });
    }
  });
  app2.get("/api/organizations", nonRedirectingAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizations2 = await storage.getUserAccessibleOrganizations(userId);
      res.json(organizations2);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });
  app2.get("/api/organizations/:id", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });
  app2.post("/api/organizations", nonRedirectingAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const validatedData = insertOrganizationSchema.parse(req.body);
      const orgDataWithCreator = {
        ...validatedData,
        createdById: userId
      };
      const newOrg = await storage.createOrganization(orgDataWithCreator);
      res.status(201).json(newOrg);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });
  app2.put("/api/organizations/:id", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const validatedData = insertOrganizationSchema.partial().parse(req.body);
      const updatedOrg = await storage.updateOrganization(organizationId, validatedData);
      res.json(updatedOrg);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });
  app2.delete("/api/organizations/:id", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      if (organization.isParent) {
        return res.status(400).json({ message: "Cannot delete parent organization" });
      }
      await storage.deleteOrganization(organizationId);
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });
  app2.get("/api/organizations/:id/admins", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      const admins = await storage.getOrganizationAdmins(organizationId);
      res.json(admins);
    } catch (error) {
      console.error("Error fetching organization admins:", error);
      res.status(500).json({ message: "Failed to fetch organization admins" });
    }
  });
  app2.post("/api/organizations/:id/admins", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const bodyData = insertOrganizationAdminSchema.parse(req.body);
      const validatedData = {
        ...bodyData,
        organizationId
      };
      const newAdmin = await storage.addOrganizationAdmin(validatedData);
      res.status(201).json(newAdmin);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding organization admin:", error);
      res.status(500).json({ message: "Failed to add organization admin" });
    }
  });
  app2.delete("/api/organizations/:id/admins/:userId", enhancedAuth, async (req, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = req.params.id;
      const targetUserId = req.params.userId;
      const isSuperAdmin = await storage.isUserSuperAdmin(currentUserId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      await storage.removeOrganizationAdmin(organizationId, targetUserId);
      res.json({ message: "Organization admin removed successfully" });
    } catch (error) {
      console.error("Error removing organization admin:", error);
      res.status(500).json({ message: "Failed to remove organization admin" });
    }
  });
  app2.post("/api/organizations/:id/copy-course", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetOrganizationId = req.params.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      const copiedCourse = await storage.copyCourseToOrganization(courseId, targetOrganizationId);
      res.status(201).json(copiedCourse);
    } catch (error) {
      console.error("Error copying course:", error);
      res.status(500).json({ message: "Failed to copy course" });
    }
  });
  app2.get("/api/users/lookup", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: "Email query parameter is required" });
      }
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUserFromEmail(email);
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error("Error looking up user:", error);
      res.status(500).json({ message: "Failed to lookup user" });
    }
  });
  app2.get("/api/players", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global player data" });
      }
      const players2 = await storage.getAllPlayers();
      res.json(createPreviewResponse(players2));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });
  app2.get("/api/organizations/:organizationId/players", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }
      const players2 = await storage.getAllPlayers(organizationId);
      const mappedPlayers = players2.map(mapPlayerForAPI);
      res.json(createPreviewResponse(mappedPlayers));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });
  app2.post("/api/organizations/:organizationId/players", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Organization admin access required" });
      }
      const bodyData = insertPlayerSchema.omit({ organizationId: true }).parse(req.body);
      const validatedData = {
        ...bodyData,
        organizationId
      };
      const newPlayer = await storage.createPlayer(validatedData);
      res.status(200).json(createPreviewResponse(newPlayer));
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating player:", error);
      res.status(500).json({ message: "Failed to create player" });
    }
  });
  app2.patch("/api/organizations/:organizationId/players/:playerId", enhancedAuth, async (req, res) => {
    try {
      const { organizationId, playerId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Organization admin access required" });
      }
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      if (player.organizationId !== organizationId) {
        return res.status(403).json({ message: "Player does not belong to this organization" });
      }
      const requestData = { ...req.body };
      if ("handicap" in requestData) {
        requestData.currentHandicap = requestData.handicap;
        delete requestData.handicap;
      }
      const validatedData = insertPlayerSchema.omit({ organizationId: true }).partial().parse(requestData);
      const updatedPlayer = await storage.updatePlayer(playerId, validatedData);
      const mappedPlayer = mapPlayerForAPI(updatedPlayer);
      res.json(createPreviewResponse(mappedPlayer));
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating player:", error);
      res.status(500).json({ message: "Failed to update player" });
    }
  });
  app2.get("/api/players/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const playerId = req.params.id;
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player" });
        }
      }
      res.json(createPreviewResponse(player));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player" });
    }
  });
  app2.post("/api/players", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validatedData = insertPlayerSchema.parse(req.body);
      const newPlayer = await storage.createPlayer(validatedData);
      res.status(201).json(newPlayer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create player" });
    }
  });
  app2.put("/api/players/:id", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validatedData = insertPlayerSchema.partial().parse(req.body);
      const updatedPlayer = await storage.updatePlayer(req.params.id, validatedData);
      res.json(updatedPlayer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });
  app2.delete("/api/players/:id", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deletePlayer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete player" });
    }
  });
  app2.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global course data" });
      }
      const courses2 = await storage.getAllCourses();
      res.json(courses2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });
  app2.get("/api/organizations/:organizationId/courses", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }
      const courses2 = await storage.getAllCourses();
      res.json(courses2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });
  app2.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseId = req.params.id;
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, course.organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, course.organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this course" });
        }
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });
  app2.get("/api/courses/:id/holes", isAuthenticated, async (req, res) => {
    try {
      const courseId = req.params.id;
      const holes2 = await storage.getHolesByCourse(courseId);
      res.json(holes2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holes" });
    }
  });
  app2.post("/api/courses", isPreviewMode() ? (req, res, next) => next() : isAuthenticated, async (req, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || "");
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        console.log("\u{1F527} Preview mode: Allowing course creation for demonstration");
      }
      const validatedData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse(validatedData);
      res.status(201).json(newCourse);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Course creation error:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });
  app2.put("/api/courses/:id", isPreviewMode() ? (req, res, next) => next() : isAuthenticated, async (req, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || "");
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        console.log("\u{1F527} Preview mode: Allowing course update for demonstration");
      }
      const courseId = req.params.id;
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      const validatedData = insertCourseSchema.parse(req.body);
      const updatedCourse = await storage.updateCourse(courseId, validatedData);
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });
  app2.delete("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const courseId = req.params.id;
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      const courseRounds = await storage.getAllRounds();
      const hasRounds = courseRounds.some((round) => round.courseId === courseId);
      if (hasRounds) {
        return res.status(400).json({
          message: "Cannot delete course with existing rounds. Delete all rounds first."
        });
      }
      await storage.deleteCourse(courseId);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });
  app2.put("/api/holes/:id", isPreviewMode() ? (req, res, next) => next() : isAuthenticated, async (req, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || "");
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        console.log("\u{1F527} Preview mode: Allowing hole update for demonstration");
      }
      const { par, distance } = req.body;
      if (par && (par < 3 || par > 5)) {
        return res.status(400).json({ message: "Par must be between 3 and 5" });
      }
      if (distance && (distance < 50 || distance > 700)) {
        return res.status(400).json({ message: "Distance must be between 50 and 700 yards" });
      }
      const updatedHole = await storage.updateHole(req.params.id, { par, distance });
      res.json(updatedHole);
    } catch (error) {
      console.error("Error updating hole:", error);
      res.status(500).json({ message: "Failed to update hole" });
    }
  });
  app2.post("/api/admin/courses/:courseId/ensure-holes", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const authenticatedPlayer = await storage.getPlayerByEmail(userEmail || "");
      if (!authenticatedPlayer?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const courseId = req.params.courseId;
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const existingHoles = await storage.getHolesByCourse(courseId);
      if (existingHoles.length === 18) {
        return res.json({
          message: "Course already has 18 holes",
          count: 18,
          holes: existingHoles.sort((a, b) => a.number - b.number)
        });
      }
      await storage.deleteHolesByCourse(courseId);
      const defaultHoles = Array.from({ length: 18 }, (_, i) => {
        const defaultPars = [4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5];
        return {
          courseId,
          number: i + 1,
          par: defaultPars[i],
          distance: 400
          // Default distance
        };
      });
      const newHoles = await storage.createHoles(defaultHoles);
      res.json({
        message: "Successfully ensured 18 holes for course",
        count: newHoles.length,
        holes: newHoles.sort((a, b) => a.number - b.number)
      });
    } catch (error) {
      console.error("Error ensuring course holes:", error);
      res.status(500).json({ message: "Failed to ensure course holes" });
    }
  });
  app2.get("/api/rounds", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global rounds data" });
      }
      const { month, playerId } = req.query;
      let rounds2;
      if (playerId) {
        rounds2 = await storage.getRoundsByPlayer(
          playerId,
          month
        );
      } else {
        rounds2 = await storage.getAllRounds(month);
      }
      res.json(rounds2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rounds" });
    }
  });
  app2.get("/api/organizations/:organizationId/rounds", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }
      const { month, playerId } = req.query;
      let rounds2;
      if (playerId) {
        rounds2 = await storage.getRoundsByPlayer(
          playerId,
          month,
          organizationId
        );
      } else {
        rounds2 = await storage.getAllRounds(month, organizationId);
      }
      res.json(rounds2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rounds" });
    }
  });
  app2.post("/api/organizations/:organizationId/rounds", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Organization admin access required" });
      }
      const validatedData = createAdminRoundSchema.parse(req.body);
      const targetPlayer = await storage.getPlayer(validatedData.playerId);
      if (!targetPlayer) {
        return res.status(404).json({ message: "Player not found" });
      }
      if (targetPlayer.organizationId !== organizationId) {
        return res.status(403).json({ message: "Player does not belong to this organization" });
      }
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const holes2 = await storage.getHolesByCourse(course.id);
      if (holes2.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }
      const holePars = holes2.sort((a, b) => a.number - b.number).map((h) => h.par);
      const willingdonHandicap = targetPlayer.currentHandicap;
      let courseHandicap;
      if (course.slope) {
        const handicapIndex = willingdonHandicap * 113 / 110;
        const slopeValue = parseFloat(course.slope.toString());
        courseHandicap = Math.round(handicapIndex * slopeValue / 113);
        console.log(`\u{1F3CC}\uFE0F ORG COURSE HANDICAP CALC:`, {
          player: targetPlayer.name,
          willingdonHandicap,
          courseSlope: slopeValue,
          handicapIndex,
          calculation: `round((${handicapIndex} * ${slopeValue}) / 113)`,
          beforeRound: handicapIndex * slopeValue / 113,
          result: courseHandicap
        });
      } else {
        courseHandicap = willingdonHandicap;
      }
      const scoreCalculation = calculateRoundScores(
        validatedData.rawScores,
        holePars,
        courseHandicap,
        course.parTotal
      );
      const roundData = {
        ...validatedData,
        playerId: validatedData.playerId,
        courseHandicap,
        // Use calculated course handicap
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString(),
        source: "admin"
      };
      const newRound = await storage.createRound(roundData);
      res.status(201).json(createPreviewResponse(newRound));
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating round:", error);
      res.status(500).json({ message: "Failed to create round" });
    }
  });
  app2.put("/api/organizations/:organizationId/rounds/:roundId", enhancedAuth, async (req, res) => {
    try {
      const { organizationId, roundId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Organization admin access required" });
      }
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      const player = await storage.getPlayer(existingRound.playerId);
      if (player?.organizationId !== organizationId) {
        return res.status(403).json({ message: "Round does not belong to this organization" });
      }
      const { rawScores, courseHandicap } = req.body;
      if (!Array.isArray(rawScores) || rawScores.length !== 18) {
        return res.status(400).json({ message: "Must provide exactly 18 scores" });
      }
      if (!rawScores.every((score) => Number.isInteger(score) && score >= 1 && score <= 10)) {
        return res.status(400).json({ message: "All scores must be integers between 1 and 10" });
      }
      const updatedHandicap = courseHandicap !== void 0 ? courseHandicap : existingRound.courseHandicap;
      if (typeof updatedHandicap !== "number" || updatedHandicap < 0 || updatedHandicap > 54) {
        return res.status(400).json({ message: "Course handicap must be a number between 0 and 54" });
      }
      const course = await storage.getCourse(existingRound.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const holes2 = await storage.getHolesByCourse(course.id);
      if (holes2.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }
      const holePars = holes2.sort((a, b) => a.number - b.number).map((h) => h.par);
      const scoreCalculation = calculateRoundScores(
        rawScores,
        holePars,
        updatedHandicap,
        course.parTotal
      );
      const updatedRound = await storage.updateRound(roundId, {
        rawScores,
        courseHandicap: updatedHandicap,
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString()
      });
      res.json(createPreviewResponse(updatedRound));
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Failed to update round" });
    }
  });
  app2.delete("/api/organizations/:organizationId/rounds/:roundId", enhancedAuth, async (req, res) => {
    try {
      const { organizationId, roundId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Organization admin access required" });
      }
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      const player = await storage.getPlayer(existingRound.playerId);
      if (player?.organizationId !== organizationId) {
        return res.status(403).json({ message: "Round does not belong to this organization" });
      }
      await storage.deleteRound(roundId);
      res.json({ message: "Round deleted successfully" });
    } catch (error) {
      console.error("Error deleting round:", error);
      res.status(500).json({ message: "Failed to delete round" });
    }
  });
  app2.post("/api/rounds", isAuthenticated, async (req, res) => {
    try {
      console.log("\u{1F4DD} POST /api/rounds - Request body:", JSON.stringify(req.body, null, 2));
      const validatedData = createPlayerRoundSchema.parse(req.body);
      console.log("\u2705 Validation passed:", JSON.stringify(validatedData, null, 2));
      const { organizationId } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization context is required" });
      }
      const userId = req.user.claims.sub;
      const authenticatedPlayer = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
      if (!authenticatedPlayer) {
        return res.status(404).json({
          code: "PLAYER_PROFILE_REQUIRED",
          message: "Player profile not found in this organization. Please contact admin to set up your account."
        });
      }
      const player = authenticatedPlayer;
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const holes2 = await storage.getHolesByCourse(course.id);
      if (holes2.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }
      const holePars = holes2.sort((a, b) => a.number - b.number).map((h) => h.par);
      const willingdonHandicap = player.currentHandicap;
      let courseHandicap;
      if (course.slope) {
        const handicapIndex = willingdonHandicap * 113 / 110;
        const slopeValue = parseFloat(course.slope.toString());
        courseHandicap = Math.round(handicapIndex * slopeValue / 113);
        console.log(`\u{1F3CC}\uFE0F PLAYER COURSE HANDICAP CALC:`, {
          player: player.name,
          willingdonHandicap,
          courseSlope: slopeValue,
          handicapIndex,
          calculation: `round((${handicapIndex} * ${slopeValue}) / 113)`,
          beforeRound: handicapIndex * slopeValue / 113,
          result: courseHandicap
        });
      } else {
        courseHandicap = willingdonHandicap;
      }
      const scoreCalculation = calculateRoundScores(
        validatedData.rawScores,
        holePars,
        courseHandicap,
        course.parTotal
      );
      const roundData = {
        ...validatedData,
        playerId: player.id,
        // Always use authenticated player's ID
        courseHandicap,
        // Use calculated course handicap
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString()
      };
      const newRound = await storage.createRound(roundData);
      res.status(201).json(newRound);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("\u274C Validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("\u274C Server error creating round:", error);
      res.status(500).json({ message: "Failed to create round" });
    }
  });
  app2.post("/api/admin/rounds", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const authenticatedPlayer = await storage.getPlayerByEmail(userEmail || "");
      if (!authenticatedPlayer?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validatedData = createAdminRoundSchema.parse(req.body);
      const targetPlayer = await storage.getPlayer(validatedData.playerId);
      if (!targetPlayer) {
        return res.status(404).json({ message: "Target player not found" });
      }
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const holes2 = await storage.getHolesByCourse(course.id);
      if (holes2.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }
      const holePars = holes2.sort((a, b) => a.number - b.number).map((h) => h.par);
      const willingdonHandicap = targetPlayer.currentHandicap;
      let courseHandicap;
      if (course.slope) {
        const handicapIndex = willingdonHandicap * 113 / 110;
        const slopeValue = parseFloat(course.slope.toString());
        courseHandicap = Math.round(handicapIndex * slopeValue / 113);
        console.log(`\u{1F3CC}\uFE0F ADMIN COURSE HANDICAP CALC:`, {
          player: targetPlayer.name,
          willingdonHandicap,
          courseSlope: slopeValue,
          handicapIndex,
          calculation: `round((${handicapIndex} * ${slopeValue}) / 113)`,
          beforeRound: handicapIndex * slopeValue / 113,
          result: courseHandicap
        });
      } else {
        courseHandicap = willingdonHandicap;
      }
      const scoreCalculation = calculateRoundScores(
        validatedData.rawScores,
        holePars,
        courseHandicap,
        course.parTotal
      );
      const roundData = {
        ...validatedData,
        playerId: validatedData.playerId,
        // Use the specified playerId for admin test rounds
        courseHandicap,
        // Use calculated course handicap
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString(),
        source: "admin"
      };
      const newRound = await storage.createRound(roundData);
      res.status(201).json(newRound);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create admin test round" });
    }
  });
  app2.put("/api/rounds/:id", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const roundId = req.params.id;
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      const { rawScores, courseHandicap } = req.body;
      if (!Array.isArray(rawScores) || rawScores.length !== 18) {
        return res.status(400).json({ message: "Must provide exactly 18 scores" });
      }
      if (!rawScores.every((score) => Number.isInteger(score) && score >= 1 && score <= 10)) {
        return res.status(400).json({ message: "All scores must be integers between 1 and 10" });
      }
      const updatedHandicap = courseHandicap !== void 0 ? courseHandicap : existingRound.courseHandicap;
      if (typeof updatedHandicap !== "number" || updatedHandicap < 0 || updatedHandicap > 54) {
        return res.status(400).json({ message: "Course handicap must be a number between 0 and 54" });
      }
      const course = await storage.getCourse(existingRound.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      const holes2 = await storage.getHolesByCourse(course.id);
      if (holes2.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }
      const holePars = holes2.sort((a, b) => a.number - b.number).map((h) => h.par);
      const scoreCalculation = calculateRoundScores(
        rawScores,
        holePars,
        updatedHandicap,
        course.parTotal
      );
      const updatedRound = await storage.updateRound(roundId, {
        rawScores,
        courseHandicap: updatedHandicap,
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString()
      });
      res.json(updatedRound);
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Failed to update round" });
    }
  });
  app2.delete("/api/rounds/:id", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const roundId = req.params.id;
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      await storage.deleteRound(roundId);
      res.json({ message: "Round deleted successfully" });
    } catch (error) {
      console.error("Error deleting round:", error);
      res.status(500).json({ message: "Failed to delete round" });
    }
  });
  app2.get("/api/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  app2.get("/api/organizations/:organizationId/leaderboard", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }
      const leaderboard = await storage.getLeaderboard(organizationId);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  app2.get("/api/leaderboard/monthly/:month", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }
      const { month } = req.params;
      const leaderboard = await storage.getMonthlyLeaderboard(month);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly leaderboard" });
    }
  });
  app2.get("/api/leaderboard/cumulative", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }
      const leaderboard = await storage.getCumulativeLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cumulative leaderboard" });
    }
  });
  app2.get("/api/leaderboard/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }
      const history = await storage.getLeaderboardHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard history" });
    }
  });
  app2.get("/api/leaderboard/history/:month", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }
      const { month } = req.params;
      const snapshot = await storage.getMonthlyLeaderboardSnapshot(month);
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly leaderboard snapshot" });
    }
  });
  app2.get("/api/monthly-winners", async (req, res) => {
    try {
      const winners = await storage.getMonthlyWinners();
      res.json(winners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly winners" });
    }
  });
  app2.get("/api/monthly-winners/:month", async (req, res) => {
    try {
      const { month } = req.params;
      const winner = await storage.getMonthlyWinner(month);
      res.json(winner || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly winner" });
    }
  });
  app2.post("/api/admin/announce-winner", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { month, winnerId, winnerName, winnerScore, runnerUpId, runnerUpName, runnerUpScore } = req.body;
      if (!month || !winnerId || !winnerName || winnerScore === void 0) {
        return res.status(400).json({ message: "Missing required winner data" });
      }
      const existingWinner = await storage.getMonthlyWinner(month);
      if (existingWinner) {
        return res.status(400).json({ message: "Winner already announced for this month" });
      }
      await storage.saveMonthlyLeaderboardSnapshot(month);
      const winnerData = {
        month,
        winnerId,
        winnerName,
        winnerScore: winnerScore.toString(),
        runnerUpId: runnerUpId || null,
        runnerUpName: runnerUpName || null,
        runnerUpScore: runnerUpScore ? runnerUpScore.toString() : null,
        announcedBy: player.id
      };
      const result = await storage.announceMonthlyWinner(winnerData);
      res.json(result);
    } catch (error) {
      console.error("Error announcing monthly winner:", error);
      res.status(500).json({ message: "Failed to announce monthly winner" });
    }
  });
  app2.get("/api/players/:playerId/stats/monthly/:month", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId, month } = req.params;
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player's stats" });
        }
      }
      const stats = await storage.getPlayerMonthlyStats(playerId, month);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player monthly stats" });
    }
  });
  app2.get("/api/players/:playerId/stats/cumulative", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId } = req.params;
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player's stats" });
        }
      }
      const stats = await storage.getPlayerCumulativeStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player cumulative stats" });
    }
  });
  const handleHandicapRecalculation = async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { window, month } = handicapRecalcSchema.parse(req.body);
      let targetMonth;
      if (window === "previous") {
        targetMonth = void 0;
      } else if (window === "specific" && month) {
        targetMonth = month;
      }
      const result = await handicapService.runMonthlyRecalculation(targetMonth);
      res.json(result);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to run handicap recalculation" });
    }
  };
  app2.post("/api/handicaps/apply", isAuthenticated, handleHandicapRecalculation);
  app2.get("/api/handicaps/apply", async (req, res) => {
    if (isPreviewMode()) {
      return res.status(403).json({ message: "Preview mode: handicap recalculation disabled" });
    }
    try {
      const window = req.query.window || "previous";
      const month = req.query.month;
      let targetMonth;
      if (window === "previous") {
        targetMonth = void 0;
      } else if (window === "specific" && month) {
        targetMonth = month;
      }
      const result = await handicapService.runMonthlyRecalculation(targetMonth);
      console.log(`[CRON] Automated handicap recalculation completed for ${result.month}. ${result.playersUpdated} players updated.`);
      res.json({
        success: true,
        automated: true,
        ...result
      });
    } catch (error) {
      console.error("[CRON] Automated handicap recalculation failed:", error);
      res.status(500).json({
        success: false,
        automated: true,
        message: "Failed to run automated handicap recalculation"
      });
    }
  });
  app2.get("/api/handicaps/summary/:month", async (req, res) => {
    try {
      const summary = await handicapService.getMonthlyUpdateSummary(req.params.month);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch handicap summary" });
    }
  });
  app2.post("/api/handicaps/test-email", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const { emailService: emailService2 } = await Promise.resolve().then(() => (init_emailService(), emailService_exports));
      await emailService2.sendHandicapChangeNotification({
        playerName: "Test Player",
        playerEmail: userEmail || "admin@example.com",
        month: "2025-01",
        prevHandicap: 16,
        newHandicap: 14,
        delta: -2,
        roundsPlayed: 5
      });
      res.json({
        success: true,
        message: `Test email sent to ${userEmail}`,
        sentTo: userEmail
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({
        message: "Failed to send test email",
        error: error.message
      });
    }
  });
  app2.get("/api/handicaps/snapshots", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global handicap data" });
      }
      const snapshots = await storage.getAllHandicapSnapshots();
      res.json(createPreviewResponse(snapshots));
    } catch (error) {
      console.error("Error fetching handicap snapshots:", error);
      res.status(500).json({ message: "Failed to fetch handicap snapshots" });
    }
  });
  app2.get("/api/organizations/:organizationId/handicaps/snapshots", enhancedAuth, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }
      const snapshots = await storage.getAllHandicapSnapshots(organizationId);
      res.json(createPreviewResponse(snapshots));
    } catch (error) {
      console.error("Error fetching handicap snapshots:", error);
      res.status(500).json({ message: "Failed to fetch handicap snapshots" });
    }
  });
  app2.get("/api/handicaps/export", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const snapshots = await storage.getAllHandicapSnapshots();
      const csvHeader = "Player,Month,Previous Handicap,Rounds Count,Avg Monthly Over Par,Change,New Handicap,Date\n";
      const csvRows = snapshots.map((snapshot) => {
        const avgOverPar = snapshot.avgMonthlyOverPar ? parseFloat(snapshot.avgMonthlyOverPar.toString()).toFixed(1) : "N/A";
        const delta = parseFloat(snapshot.delta.toString()).toFixed(0);
        const date2 = new Date(snapshot.createdAt).toLocaleDateString();
        return `"${snapshot.playerName}","${snapshot.month}",${snapshot.prevHandicap},${snapshot.roundsCount},"${avgOverPar}","${delta}",${snapshot.newHandicap},"${date2}"`;
      }).join("\n");
      const csvContent = csvHeader + csvRows;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="handicap-snapshots-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting handicap data:", error);
      res.status(500).json({ message: "Failed to export handicap data" });
    }
  });
  app2.post("/api/import/rounds", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { csvData, autoCreatePlayers, autoCreateCourses } = importRoundsSchema.parse(req.body);
      const parsedData = importService.parseCSV(csvData);
      const result = await importService.importRounds(parsedData, {
        autoCreatePlayers,
        autoCreateCourses
      });
      res.json(result);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import rounds" });
    }
  });
  app2.get("/api/import/sample-csv", async (req, res) => {
    try {
      const sampleCSV = importService.getSampleCSV();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="sample-rounds.csv"');
      res.send(sampleCSV);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sample CSV" });
    }
  });
  app2.get("/api/group/settings", async (req, res) => {
    try {
      const settings = await storage.getGroupSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group settings" });
    }
  });
  app2.put("/api/group/settings", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { groupName } = req.body;
      if (!groupName || typeof groupName !== "string") {
        return res.status(400).json({ message: "Group name is required" });
      }
      const updatedSettings = await storage.updateGroupSettings({ groupName });
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group settings" });
    }
  });
  app2.post("/api/seed", isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || "");
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const seedPlayers = [
        { name: "Ashok Hiremath", email: "ashokhiremath6@gmail.com", currentHandicap: 16, isAdmin: true },
        { name: "Debashish Das", email: "debashish@example.com", currentHandicap: 14, isAdmin: false },
        { name: "Dev Bhattacharya", email: "dev@example.com", currentHandicap: 13, isAdmin: false }
      ];
      for (const playerData of seedPlayers) {
        const existing = await storage.getPlayerByEmail(playerData.email);
        if (!existing) {
          await storage.createPlayer(playerData);
        }
      }
      const willingdonCourse = await storage.getCourseByName("Willingdon Golf Club");
      if (!willingdonCourse) {
        const course = await storage.createCourse({
          name: "Willingdon Golf Club",
          tees: "Blue",
          parTotal: 65
        });
        const willingdonPars = [4, 3, 4, 4, 4, 3, 5, 3, 4, 3, 4, 3, 3, 3, 4, 3, 5, 3];
        const willingdonHoles = willingdonPars.map((par, index2) => ({
          courseId: course.id,
          number: index2 + 1,
          par,
          distance: par === 3 ? 150 : par === 4 ? 400 : 520
        }));
        await storage.createHoles(willingdonHoles);
      }
      const bpgcCourse = await storage.getCourseByName("BPGC");
      if (!bpgcCourse) {
        const course = await storage.createCourse({
          name: "BPGC",
          tees: "Blue",
          parTotal: 70
        });
        const bpgcPars = [5, 3, 4, 5, 4, 3, 4, 3, 4, 3, 4, 5, 3, 4, 4, 5, 3, 5];
        const bpgcHoles = bpgcPars.map((par, index2) => ({
          courseId: course.id,
          number: index2 + 1,
          par,
          distance: par === 3 ? 150 : par === 4 ? 400 : 520
        }));
        await storage.createHoles(bpgcHoles);
      }
      const usClubCourse = await storage.getCourseByName("US Club");
      if (!usClubCourse) {
        const course = await storage.createCourse({
          name: "US Club",
          tees: "Blue",
          parTotal: 71
        });
        const usClubPars = [5, 3, 3, 4, 4, 4, 4, 3, 4, 3, 4, 5, 4, 4, 4, 5, 4, 5];
        const usClubHoles = usClubPars.map((par, index2) => ({
          courseId: course.id,
          number: index2 + 1,
          par,
          distance: par === 3 ? 150 : par === 4 ? 400 : 520
        }));
        await storage.createHoles(usClubHoles);
      }
      res.json({ message: "Seed data created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath, { fallthrough: true }));
  app2.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { readFileSync } from "fs";
if (process.env.NODE_ENV === "development") {
  try {
    const env = readFileSync(".env", "utf8");
    env.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key] = value;
      }
    });
  } catch (error) {
  }
}
var app = express2();
app.use(cors({
  origin: true,
  // Allow all origins
  credentials: true,
  // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-org-token"],
  exposedHeaders: ["Content-Type", "Content-Length"],
  maxAge: 86400
  // Cache preflight requests for 24 hours
}));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Application error:", err);
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  if (app.get("env") === "production") {
    const requiredEnvVars = ["DATABASE_URL"];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
      process.exit(1);
    }
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, (error) => {
    if (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
    log(`serving on port ${port}`);
  });
  const gracefulShutdown = () => {
    log("Received shutdown signal, closing server...");
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      log("Forcefully shutting down");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
})().catch((error) => {
  console.error("Fatal error during server initialization:", error);
  process.exit(1);
});
