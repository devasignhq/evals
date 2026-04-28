import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  EvalScores,
  MissedRegression,
  RegressionHotspot,
  HistoricalIssue,
  CodingStandard,
  RepoPattern,
} from "../../../shared/types.js";

export const evalResults = pgTable("eval_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: text("run_id").notNull().unique(),
  repo: text("repo").notNull(),
  prNumber: integer("pr_number").notNull(),
  headSha: text("head_sha").notNull(),
  provider: text("provider").notNull(),
  agentReviewId: text("agent_review_id"),
  evaluatedAt: timestamp("evaluated_at").notNull(),
  passed: boolean("passed").notNull(),
  regressionDetected: boolean("regression_detected").notNull(),
  overallScore: real("overall_score").notNull(),
  relevanceScore: real("relevance_score").notNull(),
  accuracyScore: real("accuracy_score").notNull(),
  depthScore: real("depth_score").notNull(),
  regressionScore: real("regression_score").notNull(),
  scores: jsonb("scores").$type<EvalScores>().notNull(),
  missedRegressions: jsonb("missed_regressions").$type<MissedRegression[]>().notNull(),
  rawJudgeResponse: text("raw_judge_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const repoIndex = pgTable("repo_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  repo: text("repo").notNull().unique(),
  indexedAt: timestamp("indexed_at").notNull(),
  ageInDays: integer("age_in_days").notNull(),
  regressionHotspots: jsonb("regression_hotspots").$type<RegressionHotspot[]>().notNull(),
  historicalIssues: jsonb("historical_issues").$type<HistoricalIssue[]>().notNull(),
  codingStandards: jsonb("coding_standards").$type<CodingStandard[]>().notNull(),
  relevantPatterns: jsonb("relevant_patterns").$type<RepoPattern[]>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const repoSettings = pgTable("repo_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  repo: text("repo").notNull().unique(),
  defaultProvider: text("default_provider").notNull().default("claude"),
  evalEnabled: boolean("eval_enabled").notNull().default(true),
  thresholdOverrides: jsonb("threshold_overrides").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EvalResultRow = typeof evalResults.$inferSelect;
export type EvalResultInsert = typeof evalResults.$inferInsert;
export type RepoIndexRow = typeof repoIndex.$inferSelect;
export type RepoSettingsRow = typeof repoSettings.$inferSelect;
