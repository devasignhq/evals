import type {
  AggregateStats,
  EvalResult,
  IndexedRepoContext,
  MissedRegression,
  ProviderStatus,
  RegressionHotspot,
  TrendDataPoint,
} from "../../../shared/types";
import { DIMENSION_WEIGHTS, THRESHOLDS } from "../../../shared/types";
import { now } from "../utils/now";

const REPOS = ["devasignhq/devasign-api", "devasignhq/devasign-mobile"] as const;

const HOTSPOTS: RegressionHotspot[] = [
  {
    filePath: "src/contracts/escrow_handler.ts",
    description: "Reentrancy guard removed in v1.4 caused double-pay incident",
    lastOccurred: "2026-01-12",
    pattern: "missing-reentrancy-guard",
  },
  {
    filePath: "src/routes/tasks.ts",
    description: "Auth check skipped on PATCH route — session-fixation bug",
    lastOccurred: "2025-11-03",
    pattern: "missing-auth-middleware",
  },
  {
    filePath: "src/lib/soroban.ts",
    description: "Big-int rounding regression on USDC payouts",
    lastOccurred: "2025-09-19",
    pattern: "decimal-precision-loss",
  },
  {
    filePath: "src/services/github.ts",
    description: "Webhook signature verification short-circuited in retry path",
    lastOccurred: "2025-08-22",
    pattern: "missing-signature-verification",
  },
];

const HISTORICAL_ISSUES: IndexedRepoContext["historicalIssues"] = [
  {
    description: "Stellar txn signed with wrong network passphrase on testnet",
    affectedFiles: ["src/lib/soroban.ts"],
    resolvedIn: "v1.5.2",
    issueType: "bug",
    recurrenceRisk: "medium",
  },
  {
    description: "Race condition in escrow release vs. dispute window",
    affectedFiles: ["src/contracts/escrow_handler.ts"],
    resolvedIn: "v1.6.0",
    issueType: "bug",
    recurrenceRisk: "high",
  },
  {
    description: "Webhook secret leaked via debug log",
    affectedFiles: ["src/services/github.ts"],
    resolvedIn: "v1.4.7",
    issueType: "security",
    recurrenceRisk: "low",
  },
  {
    description: "N+1 query on /tasks list endpoint",
    affectedFiles: ["src/routes/tasks.ts"],
    resolvedIn: "v1.5.0",
    issueType: "performance",
    recurrenceRisk: "medium",
  },
  {
    description: "Implicit coupling between Indexer and Webhook handler",
    affectedFiles: ["src/services/github.ts", "src/routes/tasks.ts"],
    issueType: "architecture",
    recurrenceRisk: "low",
  },
];

const STANDARDS: IndexedRepoContext["codingStandards"] = [
  { rule: "All Soroban interactions go through src/lib/soroban.ts", scope: "contracts" },
  { rule: "Routes must use authMiddleware before any state mutation", scope: "routes" },
  { rule: "USDC amounts represented as bigint (stroops), never floats", scope: "contracts" },
];

const PATTERNS: IndexedRepoContext["relevantPatterns"] = [
  {
    pattern: "Hono route handlers return c.json directly (no shared helpers)",
    files: ["src/routes/tasks.ts", "src/routes/auth.ts"],
    frequency: "universal",
  },
  {
    pattern: "Drizzle queries always run inside transaction()",
    files: ["src/db/repos/escrow.ts"],
    frequency: "common",
  },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function dim(score: number, threshold: number, rationale: string, flags: string[] = []) {
  return {
    score,
    rationale,
    flags,
    passed: score >= threshold,
  };
}

function buildEval(seed: number): EvalResult {
  const r = rng(seed);
  const repo = REPOS[Math.floor(r() * REPOS.length)];
  const provider = r() < 0.6 ? "claude" : "gemini";
  const prNumber = 200 + seed;
  const headSha = Array.from({ length: 7 }, () =>
    Math.floor(r() * 16).toString(16)
  ).join("");
  // Make Claude/Gemini behave differently
  const base = 5 + r() * 4.5;
  const tilt = provider === "claude" ? 0.2 : -0.2;
  const relevance = Math.max(0, Math.min(10, base + r() * 2 + tilt));
  const accuracy = Math.max(0, Math.min(10, base + r() * 1.5 + tilt * 0.5));
  const depth = Math.max(0, Math.min(10, base - 0.5 + r() * 2));
  const regressionCoverage = Math.max(0, Math.min(10, base - 1 + r() * 2.5));

  const overall = Math.round(
    (relevance * DIMENSION_WEIGHTS.relevance +
      accuracy * DIMENSION_WEIGHTS.accuracy +
      depth * DIMENSION_WEIGHTS.depth +
      regressionCoverage * DIMENSION_WEIGHTS.regressionCoverage) *
      10
  );

  const missedRegressions: MissedRegression[] =
    r() < 0.2
      ? [
          {
            hotspot: HOTSPOTS[Math.floor(r() * HOTSPOTS.length)],
            reason: "Hotspot file was modified but the agent did not flag the relevant pattern.",
          },
        ]
      : [];

  const scores = {
    relevance: dim(
      relevance,
      THRESHOLDS.relevance,
      provider === "claude"
        ? "Comments closely matched the changed lines."
        : "Mostly relevant; a few comments referenced unchanged code.",
      relevance < THRESHOLDS.relevance ? ["off-target"] : []
    ),
    accuracy: dim(
      accuracy,
      THRESHOLDS.accuracy,
      "No hallucinated APIs detected.",
      accuracy < THRESHOLDS.accuracy ? ["false-positive"] : []
    ),
    depth: dim(
      depth,
      THRESHOLDS.depth,
      depth >= 7
        ? "Engaged with control flow and design implications."
        : "Mostly surface-level — style and naming nits.",
      depth < THRESHOLDS.depth ? ["shallow"] : []
    ),
    regressionCoverage: dim(
      regressionCoverage,
      THRESHOLDS.regressionCoverage,
      missedRegressions.length > 0
        ? "Failed to mention a known hotspot pattern."
        : "Touched on relevant historical concerns.",
      missedRegressions.length > 0 ? ["missed-hotspot"] : []
    ),
    overall,
  };

  const passed =
    scores.relevance.passed &&
    scores.accuracy.passed &&
    scores.depth.passed &&
    scores.regressionCoverage.passed &&
    overall >= THRESHOLDS.overall;

  const evaluatedAt = new Date(
    now() - Math.floor(r() * 60) * 24 * 3600 * 1000 - seed * 1500_000
  ).toISOString();

  return {
    runId: `run_mock_${seed}`,
    repo,
    prNumber,
    headSha,
    provider,
    evaluatedAt,
    scores,
    passed,
    regressionDetected: missedRegressions.length > 0,
    missedRegressions,
    agentReviewId: `rev_${seed}`,
    rawJudgeResponse: JSON.stringify(scores, null, 2),
  };
}

export const MOCK_EVALS: EvalResult[] = Array.from({ length: 30 }, (_, i) =>
  buildEval(i + 17)
).sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));

// Add a few PRs evaluated by both providers with meaningfully different scores
const COMPARISON_PRS = [
  { prNumber: 412, repo: REPOS[0] },
  { prNumber: 287, repo: REPOS[0] },
  { prNumber: 145, repo: REPOS[1] },
];
let extraSeed = 100;
for (const pr of COMPARISON_PRS) {
  for (const provider of ["claude", "gemini"] as const) {
    const e = buildEval(extraSeed++);
    e.repo = pr.repo;
    e.prNumber = pr.prNumber;
    e.provider = provider;
    if (provider === "gemini") {
      e.scores.depth.score = Math.max(0, e.scores.depth.score - 1.5);
      e.scores.depth.passed = e.scores.depth.score >= THRESHOLDS.depth;
      e.scores.overall = Math.max(0, e.scores.overall - 8);
      e.passed =
        e.scores.relevance.passed &&
        e.scores.accuracy.passed &&
        e.scores.depth.passed &&
        e.scores.regressionCoverage.passed &&
        e.scores.overall >= THRESHOLDS.overall;
    }
    MOCK_EVALS.push(e);
  }
}
MOCK_EVALS.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));

export function mockProviders(): { providers: ProviderStatus[] } {
  return {
    providers: [
      { provider: "claude", connected: true, model: "claude-opus-4-5" },
      { provider: "gemini", connected: true, model: "gemini-1.5-pro" },
    ],
  };
}

export function mockRepos() {
  const grouped = new Map<string, EvalResult[]>();
  for (const e of MOCK_EVALS) {
    const arr = grouped.get(e.repo) ?? [];
    arr.push(e);
    grouped.set(e.repo, arr);
  }
  const items = Array.from(grouped.entries()).map(([repo, evals]) => ({
    repo,
    lastEvaluatedAt: evals[0].evaluatedAt,
    totalEvals: evals.length,
    avgOverall: Math.round(
      evals.reduce((sum, e) => sum + e.scores.overall, 0) / evals.length
    ),
    lastIndexedAt: null,
    hotspotCount: 0,
  }));
  return { items };
}

export function mockEvals(filters: {
  repo?: string;
  provider?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  let items = MOCK_EVALS.slice();
  if (filters.repo) items = items.filter((e) => e.repo === filters.repo);
  if (filters.provider && filters.provider !== "all") {
    items = items.filter((e) => e.provider === filters.provider);
  }
  if (filters.from) items = items.filter((e) => e.evaluatedAt >= filters.from!);
  if (filters.to) items = items.filter((e) => e.evaluatedAt <= filters.to!);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
  };
}

function aggregateRangeMock(filters: {
  repo?: string;
  from?: string;
  to?: string;
}): {
  overallAvg: number;
  passRate: number;
  missedRegressions: number;
  totalEvals: number;
} {
  const { items } = mockEvals({ ...filters, page: 1, limit: 9999 });
  const total = items.length;
  if (total === 0) {
    return { overallAvg: 0, passRate: 0, missedRegressions: 0, totalEvals: 0 };
  }
  const passes = items.filter((i) => i.passed).length;
  const avg = items.reduce((s, i) => s + i.scores.overall, 0) / total;
  return {
    overallAvg: Math.round(avg),
    passRate: Math.round((passes / total) * 100),
    missedRegressions: items.filter((i) => i.regressionDetected).length,
    totalEvals: total,
  };
}

export function mockAggregate(filters: {
  repo?: string;
  from?: string;
  to?: string;
}): AggregateStats {
  const current = aggregateRangeMock(filters);

  let previous: AggregateStats["previous"];
  if (filters.from && filters.to) {
    const fromMs = new Date(filters.from).getTime();
    const toMs = new Date(filters.to).getTime();
    const duration = toMs - fromMs;
    previous = aggregateRangeMock({
      repo: filters.repo,
      from: new Date(fromMs - duration).toISOString(),
      to: new Date(fromMs).toISOString(),
    });
  }

  const overallDelta = previous ? current.overallAvg - previous.overallAvg : 0;
  const trend: AggregateStats["trend"] =
    Math.abs(overallDelta) < 1 ? "flat" : overallDelta > 0 ? "up" : "down";

  return { ...current, previous, trend };
}

export function mockTrends(filters: {
  repo?: string;
  provider?: string;
  from?: string;
  to?: string;
}): { points: TrendDataPoint[] } {
  const { items } = mockEvals({ ...filters, page: 1, limit: 9999 });
  const sorted = [...items].sort((a, b) =>
    a.evaluatedAt.localeCompare(b.evaluatedAt)
  );
  const points: TrendDataPoint[] = sorted.map((e) => ({
    date: e.evaluatedAt,
    runId: e.runId,
    repo: e.repo,
    prNumber: e.prNumber,
    provider: e.provider,
    relevance: Number(e.scores.relevance.score.toFixed(2)),
    accuracy: Number(e.scores.accuracy.score.toFixed(2)),
    depth: Number(e.scores.depth.score.toFixed(2)),
    regressionCoverage: Number(e.scores.regressionCoverage.score.toFixed(2)),
    overall: Number(e.scores.overall.toFixed(2)),
  }));
  return { points };
}

export function mockEvalDetail(repo: string, prNumber: number): EvalResult | undefined {
  return MOCK_EVALS.find((e) => e.repo === repo && e.prNumber === prNumber);
}

export function mockRepoIndex(repo: string): IndexedRepoContext {
  return {
    repoId: repo,
    indexedAt: new Date(now() - 6 * 3600 * 1000).toISOString(),
    ageInDays: 38,
    regressionHotspots: HOTSPOTS,
    historicalIssues: HISTORICAL_ISSUES,
    codingStandards: STANDARDS,
    relevantPatterns: PATTERNS,
  };
}

export function mockHotspotCoverage(repo: string, days = 30) {
  const total = HOTSPOTS.length;
  const recent = MOCK_EVALS.filter(
    (e) =>
      e.repo === repo &&
      now() - new Date(e.evaluatedAt).getTime() < days * 86400_000
  );
  const missed = new Set<string>();
  for (const e of recent) for (const m of e.missedRegressions) missed.add(m.hotspot.filePath);
  const touched = HOTSPOTS.filter((h) => !missed.has(h.filePath)).length;
  return { coverage: Math.round((touched / total) * 100), hotspotsTouched: touched, hotspotsTotal: total };
}
