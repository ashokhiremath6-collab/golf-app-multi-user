import { sql } from 'drizzle-orm';
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
  check,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(), // URL-friendly identifier
  isParent: boolean("is_parent").default(false), // True for the main "Blues Golf Challenge" organization
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization admins junction table
export const organizationAdmins = pgTable("organization_admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Players table for golf-specific data
export const players = pgTable("players", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for existing data
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  currentHandicap: integer("current_handicap").notNull().default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for existing data
  name: text("name").notNull(),
  tees: text("tees").default('Blue'),
  parTotal: integer("par_total").notNull(),
  rating: numeric("rating"),
  slope: numeric("slope"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Holes table
export const holes = pgTable("holes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  number: integer("number").notNull(),
  par: integer("par").notNull(),
  distance: integer("distance"),
}, (table) => [
  check("hole_number_valid", sql`${table.number} >= 1 AND ${table.number} <= 18`),
]);

// Rounds table
export const rounds = pgTable("rounds", {
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
  source: text("source", { enum: ['app', 'admin', 'import', 'whatsapp'] }).default('app'),
  status: text("status", { enum: ['ok', 'needs_review'] }).default('ok'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Handicap snapshots table
export const handicapSnapshots = pgTable("handicap_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  month: text("month").notNull(), // YYYY-MM format
  prevHandicap: integer("prev_handicap").notNull(),
  roundsCount: integer("rounds_count").notNull(),
  avgMonthlyOverPar: numeric("avg_monthly_over_par"),
  delta: numeric("delta").notNull(),
  newHandicap: integer("new_handicap").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly leaderboard snapshots table
export const monthlyLeaderboards = pgTable("monthly_leaderboards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  month: text("month").notNull(), // YYYY-MM format
  playerName: text("player_name").notNull(),
  roundsCount: integer("rounds_count").notNull(),
  avgNet: numeric("avg_net").notNull(),
  avgOverPar: numeric("avg_over_par").notNull(),
  avgGrossCapped: numeric("avg_gross_capped").notNull(),
  currentHandicap: integer("current_handicap").notNull(),
  rank: integer("rank").notNull(),
  lastRoundDate: date("last_round_date").notNull(),
  isFinalized: boolean("is_finalized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly winners table
export const monthlyWinners = pgTable("monthly_winners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // YYYY-MM format
  winnerId: uuid("winner_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  winnerName: text("winner_name").notNull(),
  winnerScore: numeric("winner_score").notNull(),
  runnerUpId: uuid("runner_up_id").references(() => players.id, { onDelete: "set null" }),
  runnerUpName: text("runner_up_name"),
  runnerUpScore: numeric("runner_up_score"),
  announcedAt: timestamp("announced_at").defaultNow(),
  announcedBy: uuid("announced_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Season settings table  
export const seasonSettings = pgTable("season_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for existing data
  groupName: text("group_name").default('Blues Golf Challenge'),
  seasonEnd: date("season_end").default('2026-03-31'),
  leaderboardMetric: text("leaderboard_metric").default('avg_over_par'),
  kFactor: numeric("k_factor").default('0.5'),
  changeCap: numeric("change_cap").default('2.0'),
});

// Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [organizations.createdById],
    references: [users.id],
  }),
  admins: many(organizationAdmins),
  players: many(players),
  courses: many(courses),
  seasonSettings: many(seasonSettings),
}));

export const organizationAdminsRelations = relations(organizationAdmins, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationAdmins.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationAdmins.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdOrganizations: many(organizations),
  organizationAdmins: many(organizationAdmins),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [players.organizationId],
    references: [organizations.id],
  }),
  rounds: many(rounds),
  handicapSnapshots: many(handicapSnapshots),
  monthlyLeaderboards: many(monthlyLeaderboards),
  monthlyWins: many(monthlyWinners, { relationName: 'winner' }),
  monthlyRunnerUps: many(monthlyWinners, { relationName: 'runnerUp' }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [courses.organizationId],
    references: [organizations.id],
  }),
  holes: many(holes),
  rounds: many(rounds),
}));

export const holesRelations = relations(holes, ({ one }) => ({
  course: one(courses, {
    fields: [holes.courseId],
    references: [courses.id],
  }),
}));

export const roundsRelations = relations(rounds, ({ one }) => ({
  player: one(players, {
    fields: [rounds.playerId],
    references: [players.id],
  }),
  course: one(courses, {
    fields: [rounds.courseId],
    references: [courses.id],
  }),
}));

export const handicapSnapshotsRelations = relations(handicapSnapshots, ({ one }) => ({
  player: one(players, {
    fields: [handicapSnapshots.playerId],
    references: [players.id],
  }),
}));

export const monthlyLeaderboardsRelations = relations(monthlyLeaderboards, ({ one }) => ({
  player: one(players, {
    fields: [monthlyLeaderboards.playerId],
    references: [players.id],
  }),
}));

export const monthlyWinnersRelations = relations(monthlyWinners, ({ one }) => ({
  winner: one(players, {
    fields: [monthlyWinners.winnerId],
    references: [players.id],
    relationName: 'winner',
  }),
  runnerUp: one(players, {
    fields: [monthlyWinners.runnerUpId],
    references: [players.id],
    relationName: 'runnerUp',
  }),
  announcedByPlayer: one(players, {
    fields: [monthlyWinners.announcedBy],
    references: [players.id],
    relationName: 'announcer',
  }),
}));

// Zod schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdById: true, // Backend automatically sets this from authenticated user
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationAdminSchema = createInsertSchema(organizationAdmins).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
}).extend({
  // Fix numeric fields to accept numbers instead of strings
  rating: z.union([z.number(), z.string()]).transform(val => val?.toString()).optional(),
  slope: z.union([z.number(), z.string()]).transform(val => val?.toString()).optional(),
});

export const insertHoleSchema = createInsertSchema(holes).omit({
  id: true,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  cappedScores: true,
  grossCapped: true,
  net: true,
  overPar: true,
});

export const insertMonthlyLeaderboardSchema = createInsertSchema(monthlyLeaderboards).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyWinnerSchema = createInsertSchema(monthlyWinners).omit({
  id: true,
  createdAt: true,
  announcedAt: true,
});

export const insertHandicapSnapshotSchema = createInsertSchema(handicapSnapshots).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationAdmin = typeof organizationAdmins.$inferSelect;
export type InsertOrganizationAdmin = z.infer<typeof insertOrganizationAdminSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Hole = typeof holes.$inferSelect;
export type InsertHole = z.infer<typeof insertHoleSchema>;
export type Round = typeof rounds.$inferSelect;
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type HandicapSnapshot = typeof handicapSnapshots.$inferSelect;
export type InsertHandicapSnapshot = z.infer<typeof insertHandicapSnapshotSchema>;
export type SeasonSettings = typeof seasonSettings.$inferSelect;
