import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { evalResults, repoIndex } from "../db/schema.js";

export const reposRouter = new Hono();

reposRouter.get("/", async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      repo: evalResults.repo,
      lastEvaluatedAt: sql<Date>`max(${evalResults.evaluatedAt})`,
      totalEvals: sql<number>`count(*)::int`,
      avgOverall: sql<number>`coalesce(avg(${evalResults.overallScore}), 0)`,
    })
    .from(evalResults)
    .groupBy(evalResults.repo)
    .orderBy(sql`max(${evalResults.evaluatedAt}) desc`);

  return c.json({
    items: rows.map((r) => ({
      repo: r.repo,
      lastEvaluatedAt: r.lastEvaluatedAt
        ? new Date(r.lastEvaluatedAt).toISOString()
        : null,
      totalEvals: Number(r.totalEvals),
      avgOverall: Math.round(Number(r.avgOverall)),
    })),
  });
});

reposRouter.get("/:org/:name/index", async (c) => {
  const repo = `${c.req.param("org")}/${c.req.param("name")}`;
  const db = getDb();
  const rows = await db
    .select()
    .from(repoIndex)
    .where(eq(repoIndex.repo, repo))
    .limit(1);
  const cached = rows[0];
  if (!cached) return c.json({ error: "not indexed yet" }, 404);
  return c.json({
    repoId: cached.repo,
    indexedAt: cached.indexedAt.toISOString(),
    ageInDays: cached.ageInDays,
    regressionHotspots: cached.regressionHotspots,
    historicalIssues: cached.historicalIssues,
    codingStandards: cached.codingStandards,
    relevantPatterns: cached.relevantPatterns,
  });
});

reposRouter.get("/:org/:name/hotspot-coverage", async (c) => {
  const repo = `${c.req.param("org")}/${c.req.param("name")}`;
  const days = Math.min(180, parseInt(c.req.query("days") ?? "30", 10) || 30);
  const db = getDb();

  const idxRows = await db
    .select()
    .from(repoIndex)
    .where(eq(repoIndex.repo, repo))
    .limit(1);
  const idx = idxRows[0];
  if (!idx) {
    return c.json({ coverage: 0, hotspotsTouched: 0, hotspotsTotal: 0 });
  }
  const hotspots = idx.regressionHotspots;

  const recent = await db
    .select({
      missed: evalResults.missedRegressions,
    })
    .from(evalResults)
    .where(
      sql`${evalResults.repo} = ${repo} and ${evalResults.evaluatedAt} >= now() - (${days} || ' days')::interval`
    );

  const missedPaths = new Set<string>();
  for (const r of recent) {
    for (const m of r.missed) {
      missedPaths.add(m.hotspot.filePath);
    }
  }
  const hotspotsTotal = hotspots.length;
  const hotspotsTouched = hotspots.filter(
    (h) => !missedPaths.has(h.filePath)
  ).length;
  const coverage = hotspotsTotal === 0 ? 0 : Math.round((hotspotsTouched / hotspotsTotal) * 100);
  return c.json({ coverage, hotspotsTouched, hotspotsTotal });
});
