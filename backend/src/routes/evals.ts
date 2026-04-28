import { Hono } from "hono";
import { and, between, desc, eq, gte, lte, sql } from "drizzle-orm";
import type {
  AggregateStats,
  EvalResult,
  TrendDataPoint,
} from "../../../shared/types.js";
import { getDb } from "../db/client.js";
import { evalResults } from "../db/schema.js";

export const evalsRouter = new Hono();

function rowToResult(r: typeof evalResults.$inferSelect): EvalResult {
  return {
    runId: r.runId,
    repo: r.repo,
    prNumber: r.prNumber,
    headSha: r.headSha,
    provider: r.provider as "claude" | "gemini",
    evaluatedAt: r.evaluatedAt.toISOString(),
    scores: r.scores,
    passed: r.passed,
    regressionDetected: r.regressionDetected,
    missedRegressions: r.missedRegressions,
    agentReviewId: r.agentReviewId ?? "",
    rawJudgeResponse: r.rawJudgeResponse ?? "",
  };
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

evalsRouter.get("/", async (c) => {
  const repo = c.req.query("repo");
  const provider = c.req.query("provider");
  const from = parseDate(c.req.query("from"));
  const to = parseDate(c.req.query("to"));
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const limit = Math.min(100, parseInt(c.req.query("limit") ?? "20", 10) || 20);

  const db = getDb();
  const conds = [];
  if (repo) conds.push(eq(evalResults.repo, repo));
  if (provider) conds.push(eq(evalResults.provider, provider));
  if (from && to) conds.push(between(evalResults.evaluatedAt, from, to));
  else if (from) conds.push(gte(evalResults.evaluatedAt, from));
  else if (to) conds.push(lte(evalResults.evaluatedAt, to));

  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select()
    .from(evalResults)
    .where(where)
    .orderBy(desc(evalResults.evaluatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(evalResults)
    .where(where);
  const total = totalRow[0]?.count ?? 0;

  return c.json({
    items: rows.map(rowToResult),
    page,
    limit,
    total,
  });
});

async function aggregateRange(
  db: ReturnType<typeof getDb>,
  repo: string | undefined,
  from: Date | undefined,
  to: Date | undefined
) {
  const conds = [];
  if (repo) conds.push(eq(evalResults.repo, repo));
  if (from && to) conds.push(between(evalResults.evaluatedAt, from, to));
  else if (from) conds.push(gte(evalResults.evaluatedAt, from));
  else if (to) conds.push(lte(evalResults.evaluatedAt, to));
  const where = conds.length ? and(...conds) : undefined;

  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      avgOverall: sql<number>`coalesce(avg(${evalResults.overallScore}), 0)`,
      passes: sql<number>`coalesce(sum(case when ${evalResults.passed} then 1 else 0 end), 0)::int`,
      missed: sql<number>`coalesce(sum(case when ${evalResults.regressionDetected} then 1 else 0 end), 0)::int`,
    })
    .from(evalResults)
    .where(where);

  const s = stats[0] ?? { total: 0, avgOverall: 0, passes: 0, missed: 0 };
  const total = Number(s.total);
  return {
    overallAvg: Math.round(Number(s.avgOverall)),
    passRate: total > 0 ? Math.round((Number(s.passes) / total) * 100) : 0,
    missedRegressions: Number(s.missed),
    totalEvals: total,
  };
}

evalsRouter.get("/aggregate", async (c) => {
  const repo = c.req.query("repo");
  const from = parseDate(c.req.query("from"));
  const to = parseDate(c.req.query("to"));

  const db = getDb();
  const current = await aggregateRange(db, repo, from, to);

  let previous: AggregateStats["previous"];
  if (from && to) {
    const duration = to.getTime() - from.getTime();
    const prevTo = from;
    const prevFrom = new Date(from.getTime() - duration);
    previous = await aggregateRange(db, repo, prevFrom, prevTo);
  }

  const overallDelta = previous ? current.overallAvg - previous.overallAvg : 0;
  const trend: AggregateStats["trend"] =
    Math.abs(overallDelta) < 1 ? "flat" : overallDelta > 0 ? "up" : "down";

  const out: AggregateStats = {
    ...current,
    previous,
    trend,
  };
  return c.json(out);
});

evalsRouter.get("/trends", async (c) => {
  const repo = c.req.query("repo");
  const from = parseDate(c.req.query("from"));
  const to = parseDate(c.req.query("to"));

  const db = getDb();
  const conds = [];
  if (repo) conds.push(eq(evalResults.repo, repo));
  if (from && to) conds.push(between(evalResults.evaluatedAt, from, to));
  else if (from) conds.push(gte(evalResults.evaluatedAt, from));
  else if (to) conds.push(lte(evalResults.evaluatedAt, to));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      day: sql<string>`to_char(${evalResults.evaluatedAt}, 'YYYY-MM-DD')`,
      relevance: sql<number>`avg(${evalResults.relevanceScore})`,
      accuracy: sql<number>`avg(${evalResults.accuracyScore})`,
      depth: sql<number>`avg(${evalResults.depthScore})`,
      regressionCoverage: sql<number>`avg(${evalResults.regressionScore})`,
      overall: sql<number>`avg(${evalResults.overallScore})`,
    })
    .from(evalResults)
    .where(where)
    .groupBy(sql`to_char(${evalResults.evaluatedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${evalResults.evaluatedAt}, 'YYYY-MM-DD')`);

  const points: TrendDataPoint[] = rows.map((r) => ({
    date: r.day,
    relevance: Number(r.relevance),
    accuracy: Number(r.accuracy),
    depth: Number(r.depth),
    regressionCoverage: Number(r.regressionCoverage),
    overall: Number(r.overall),
  }));
  return c.json({ points });
});

evalsRouter.get("/:runId", async (c) => {
  const runId = c.req.param("runId");
  const db = getDb();
  const rows = await db
    .select()
    .from(evalResults)
    .where(eq(evalResults.runId, runId))
    .limit(1);
  const row = rows[0];
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(rowToResult(row));
});
