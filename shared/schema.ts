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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Players table for golf-specific data
export const players = pgTable("players", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").unique(),
  currentHandicap: integer("current_handicap").notNull().default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").unique().notNull(),
  tees: text("tees").default('Blue'),
  parTotal: integer("par_total").notNull(),
  rating: numeric("rating"),
  slope: numeric("slope"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Holes table
export const holes = pgTable("holes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  number: integer("number").notNull(),
  par: integer("par").notNull(),
  distance: integer("distance"),
}, (table) => [
  check("hole_number_valid", sql`${table.number} >= 1 AND ${table.number} <= 18`),
]);

// Rounds table
export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
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
  playerId: uuid("player_id").references(() => players.id).notNull(),
  month: text("month").notNull(), // YYYY-MM format
  prevHandicap: integer("prev_handicap").notNull(),
  roundsCount: integer("rounds_count").notNull(),
  avgMonthlyOverPar: numeric("avg_monthly_over_par"),
  delta: numeric("delta").notNull(),
  newHandicap: integer("new_handicap").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Season settings table
export const seasonSettings = pgTable("season_settings", {
  id: integer("id").primaryKey().default(1),
  seasonEnd: date("season_end").default('2026-03-31'),
  leaderboardMetric: text("leaderboard_metric").default('avg_over_par'),
  kFactor: numeric("k_factor").default('0.5'),
  changeCap: numeric("change_cap").default('2.0'),
});

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  rounds: many(rounds),
  handicapSnapshots: many(handicapSnapshots),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
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

// Zod schemas
export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
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

export const insertHandicapSnapshotSchema = createInsertSchema(handicapSnapshots).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
