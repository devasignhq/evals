import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { evalResults, repoIndex, repoSettings } from "../db/schema.js";
import { createGithubService } from "../services/githubService.js";
import { GithubRepoIndexer } from "../services/repoIndexerService.js";

export const reposRouter = new Hono();

reposRouter.get("/", async (c) => {
  const db = getDb();
  const evalRows = await db
    .select({
      repo: evalResults.repo,
      lastEvaluatedAt: sql<Date>`max(${evalResults.evaluatedAt})`,
      totalEvals: sql<number>`count(*)::int`,
      avgOverall: sql<number>`coalesce(avg(${evalResults.overallScore}), 0)`,
    })
    .from(evalResults)
    .groupBy(evalResults.repo);

  const settingsRows = await db
    .select({ repo: repoSettings.repo })
    .from(repoSettings);

  const indexRows = await db
    .select({
      repo: repoIndex.repo,
      indexedAt: repoIndex.indexedAt,
      hotspotCount: sql<number>`coalesce(jsonb_array_length(${repoIndex.regressionHotspots}), 0)::int`,
    })
    .from(repoIndex);
  const indexByRepo = new Map(
    indexRows.map((r) => [
      r.repo,
      {
        indexedAt: r.indexedAt ? new Date(r.indexedAt).toISOString() : null,
        hotspotCount: Number(r.hotspotCount),
      },
    ])
  );

  type RepoEntry = {
    repo: string;
    lastEvaluatedAt: string | null;
    totalEvals: number;
    avgOverall: number;
    lastIndexedAt: string | null;
    hotspotCount: number;
  };

  const byRepo = new Map<string, RepoEntry>();
  for (const r of evalRows) {
    const idx = indexByRepo.get(r.repo);
    byRepo.set(r.repo, {
      repo: r.repo,
      lastEvaluatedAt: r.lastEvaluatedAt
        ? new Date(r.lastEvaluatedAt).toISOString()
        : null,
      totalEvals: Number(r.totalEvals),
      avgOverall: Math.round(Number(r.avgOverall)),
      lastIndexedAt: idx?.indexedAt ?? null,
      hotspotCount: idx?.hotspotCount ?? 0,
    });
  }
  for (const s of settingsRows) {
    if (!byRepo.has(s.repo)) {
      const idx = indexByRepo.get(s.repo);
      byRepo.set(s.repo, {
        repo: s.repo,
        lastEvaluatedAt: null,
        totalEvals: 0,
        avgOverall: 0,
        lastIndexedAt: idx?.indexedAt ?? null,
        hotspotCount: idx?.hotspotCount ?? 0,
      });
    }
  }

  const items = [...byRepo.values()].sort((a, b) => {
    if (a.lastEvaluatedAt && b.lastEvaluatedAt) {
      return b.lastEvaluatedAt.localeCompare(a.lastEvaluatedAt);
    }
    if (a.lastEvaluatedAt) return -1;
    if (b.lastEvaluatedAt) return 1;
    return a.repo.localeCompare(b.repo);
  });

  return c.json({ items });
});

reposRouter.get("/hotspots", async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      repo: repoIndex.repo,
      hotspots: repoIndex.regressionHotspots,
    })
    .from(repoIndex);
  const items = rows.flatMap((r) =>
    r.hotspots.map((h) => ({ repo: r.repo, hotspot: h }))
  );
  return c.json({ items });
});

reposRouter.post("/:org/:name/reindex", async (c) => {
  const repo = `${c.req.param("org")}/${c.req.param("name")}`;
  try {
    const github = createGithubService();
    const indexer = new GithubRepoIndexer(github);
    const ctx = await indexer.indexRepo(repo);
    return c.json({
      ok: true,
      indexedAt: ctx.indexedAt,
      hotspotCount: ctx.regressionHotspots.length,
      historicalIssueCount: ctx.historicalIssues.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
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
