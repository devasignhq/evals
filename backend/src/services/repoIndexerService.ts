import { eq } from "drizzle-orm";
import type {
  HistoricalIssue,
  IndexedRepoContext,
  RegressionHotspot,
} from "../../../shared/types.js";
import { getDb } from "../db/client.js";
import { repoIndex } from "../db/schema.js";
import type { CommitSummary, GithubService } from "./githubService.js";
import {
  defaultProvider,
  providerFromEnv,
} from "./providers/factory.js";

const BUG_FIX_RE = /\b(fix(?:e[sd])?|bug|regression|hotfix|patch|crash)\b/i;
const REVERT_RE = /^revert\b/i;
const LOOKBACK_DAYS = 180;
const MAX_BUGFIX_COMMITS = 60;
const TOP_HOTSPOTS = 10;

export interface RepoIndexer {
  indexRepo(repo: string): Promise<IndexedRepoContext>;
}

interface FileSignal {
  filePath: string;
  commits: CommitSummary[];
}

export class GithubRepoIndexer implements RepoIndexer {
  constructor(private readonly github: GithubService) {}

  async indexRepo(repo: string): Promise<IndexedRepoContext> {
    const since = new Date(
      Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const commits = await this.github.listCommits(repo, {
      since,
      perPage: 100,
      maxPages: 3,
    });

    const bugFix = commits.filter((c) => {
      const subject = c.message.split("\n")[0];
      return BUG_FIX_RE.test(subject) || REVERT_RE.test(subject);
    });

    const sliced = bugFix.slice(0, MAX_BUGFIX_COMMITS);

    const fileMap = new Map<string, CommitSummary[]>();
    for (const c of sliced) {
      try {
        const detail = await this.github.getCommit(repo, c.sha);
        for (const f of detail.files) {
          if (f.status === "removed") continue;
          if (!isInterestingFile(f.filename)) continue;
          const list = fileMap.get(f.filename) ?? [];
          list.push(c);
          fileMap.set(f.filename, list);
        }
      } catch {
        // Skip commits we can't fetch (rare; rate-limited or 404 on merge commit).
      }
    }

    const ranked: FileSignal[] = [...fileMap.entries()]
      .map(([filePath, list]) => ({ filePath, commits: list }))
      .filter((s) => s.commits.length >= 2)
      .sort((a, b) => b.commits.length - a.commits.length)
      .slice(0, TOP_HOTSPOTS);

    const hotspots = await Promise.all(
      ranked.map((s) => buildHotspot(s))
    );

    const historicalIssues: HistoricalIssue[] = ranked.map((s) => ({
      description: `Recurring fixes in ${s.filePath} — ${s.commits.length} bug-fix commits in the last ${LOOKBACK_DAYS} days.`,
      affectedFiles: [s.filePath],
      issueType: "bug",
      recurrenceRisk:
        s.commits.length >= 5 ? "high" : s.commits.length >= 3 ? "medium" : "low",
    }));

    const indexedAt = new Date();
    const ctx: IndexedRepoContext = {
      repoId: repo,
      indexedAt: indexedAt.toISOString(),
      ageInDays: 0,
      relevantPatterns: [],
      historicalIssues,
      codingStandards: [],
      regressionHotspots: hotspots,
    };

    await persistIndex(repo, ctx, indexedAt);

    return ctx;
  }
}

async function buildHotspot(signal: FileSignal): Promise<RegressionHotspot> {
  const sortedByDate = [...signal.commits].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const last = sortedByDate[0];
  const subjects = sortedByDate
    .slice(0, 8)
    .map((c) => c.message.split("\n")[0].trim())
    .filter(Boolean);

  const pattern = await summarisePattern(signal.filePath, subjects);

  return {
    filePath: signal.filePath,
    description: subjects[0] ?? `Recurring fixes in ${signal.filePath}`,
    lastOccurred: last?.date ?? new Date().toISOString(),
    pattern,
  };
}

async function summarisePattern(
  filePath: string,
  subjects: string[]
): Promise<string> {
  if (subjects.length === 0) return "Recurring fixes; no detail available.";
  try {
    const provider = providerFromEnv(defaultProvider());
    const prompt = [
      `File: ${filePath}`,
      `Recent bug-fix commit subjects:`,
      ...subjects.map((s) => `- ${s}`),
      ``,
      `In one short sentence (under 18 words), describe the recurring issue pattern that ties these fixes together. Output the sentence only — no preamble, no quotes.`,
    ].join("\n");
    const out = await provider.judge(
      prompt,
      "You summarise recurring software defect patterns. Reply with one short sentence and nothing else."
    );
    const cleaned = out.trim().replace(/^["']|["']$/g, "");
    return cleaned.split("\n")[0].slice(0, 240) || fallbackPattern(subjects);
  } catch {
    return fallbackPattern(subjects);
  }
}

function fallbackPattern(subjects: string[]): string {
  return `Repeated bug-fix commits: ${subjects.slice(0, 3).join("; ")}`.slice(
    0,
    240
  );
}

function isInterestingFile(filename: string): boolean {
  const skip = [
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^pnpm-lock\.yaml$/,
    /^bun\.lock$/,
    /\.snap$/,
    /^\.github\//,
    /^docs?\//i,
    /^README/i,
    /^CHANGELOG/i,
    /\.md$/i,
    /\.lock$/,
  ];
  return !skip.some((re) => re.test(filename));
}

async function persistIndex(
  repo: string,
  ctx: IndexedRepoContext,
  indexedAt: Date
) {
  const db = getDb();
  const existing = await db
    .select({ id: repoIndex.id })
    .from(repoIndex)
    .where(eq(repoIndex.repo, repo))
    .limit(1);
  if (existing[0]) {
    await db
      .update(repoIndex)
      .set({
        indexedAt,
        ageInDays: 0,
        regressionHotspots: ctx.regressionHotspots,
        historicalIssues: ctx.historicalIssues,
        codingStandards: ctx.codingStandards,
        relevantPatterns: ctx.relevantPatterns,
        updatedAt: new Date(),
      })
      .where(eq(repoIndex.repo, repo));
  } else {
    await db.insert(repoIndex).values({
      repo,
      indexedAt,
      ageInDays: 0,
      regressionHotspots: ctx.regressionHotspots,
      historicalIssues: ctx.historicalIssues,
      codingStandards: ctx.codingStandards,
      relevantPatterns: ctx.relevantPatterns,
    });
  }
}

export async function loadIndexedRepoContext(
  repo: string
): Promise<IndexedRepoContext> {
  const db = getDb();
  const rows = await db
    .select()
    .from(repoIndex)
    .where(eq(repoIndex.repo, repo))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      repoId: repo,
      indexedAt: new Date().toISOString(),
      ageInDays: 0,
      relevantPatterns: [],
      historicalIssues: [],
      codingStandards: [],
      regressionHotspots: [],
    };
  }
  const ageMs = Date.now() - row.indexedAt.getTime();
  return {
    repoId: row.repo,
    indexedAt: row.indexedAt.toISOString(),
    ageInDays: Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000))),
    relevantPatterns: row.relevantPatterns,
    historicalIssues: row.historicalIssues,
    codingStandards: row.codingStandards,
    regressionHotspots: row.regressionHotspots,
  };
}
