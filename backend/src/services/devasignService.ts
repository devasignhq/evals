import type { AgentReview, IndexedRepoContext } from "../../../shared/types.js";

export interface DevasignService {
  fetchAgentReview(repo: string, prNumber: number): Promise<AgentReview>;
  fetchIndexedContext(repo: string, filePaths: string[]): Promise<IndexedRepoContext>;
}

interface DevasignServiceConfig {
  baseUrl: string;
  apiKey: string;
}

interface RawAgentReview {
  reviewId?: string;
  id?: string;
  repo?: string;
  prNumber?: number;
  pr_number?: number;
  headSha?: string;
  head_sha?: string;
  reviewedAt?: string;
  reviewed_at?: string;
  summary?: string;
  verdict?: string;
  issues?: unknown[];
  suggestions?: unknown[];
}

interface RawIssue {
  filePath?: string;
  file_path?: string;
  file?: string;
  line?: number;
  severity?: string;
  category?: string;
  description?: string;
  message?: string;
  suggestion?: string;
}

function adaptIssue(raw: unknown): AgentReview["issues"][number] {
  const r = raw as RawIssue;
  const sev = (r.severity ?? "medium").toLowerCase();
  const allowedSev = ["info", "low", "medium", "high", "critical"] as const;
  const severity =
    (allowedSev as readonly string[]).includes(sev) ? (sev as AgentReview["issues"][number]["severity"]) : "medium";
  const cat = (r.category ?? "other").toLowerCase();
  const allowedCat = [
    "security",
    "performance",
    "quality",
    "testing",
    "architecture",
    "other",
  ] as const;
  const category =
    (allowedCat as readonly string[]).includes(cat)
      ? (cat as AgentReview["issues"][number]["category"])
      : "other";
  return {
    filePath: r.filePath ?? r.file_path ?? r.file ?? "",
    line: r.line,
    severity,
    category,
    description: r.description ?? r.message ?? "",
    suggestion: r.suggestion,
  };
}

function adaptAgentReview(
  raw: RawAgentReview,
  repo: string,
  prNumber: number
): AgentReview {
  const verdictRaw = (raw.verdict ?? "comment").toLowerCase();
  const allowedVerdicts = ["approve", "request_changes", "comment"] as const;
  const verdict =
    (allowedVerdicts as readonly string[]).includes(verdictRaw)
      ? (verdictRaw as AgentReview["verdict"])
      : "comment";
  return {
    reviewId: raw.reviewId ?? raw.id ?? `rev_${repo}_${prNumber}`,
    repo: raw.repo ?? repo,
    prNumber: raw.prNumber ?? raw.pr_number ?? prNumber,
    headSha: raw.headSha ?? raw.head_sha ?? "",
    reviewedAt: raw.reviewedAt ?? raw.reviewed_at ?? new Date().toISOString(),
    summary: raw.summary ?? "",
    verdict,
    issues: Array.isArray(raw.issues) ? raw.issues.map(adaptIssue) : [],
    suggestions: Array.isArray(raw.suggestions)
      ? (raw.suggestions.filter((s) => typeof s === "string") as string[])
      : [],
  };
}

interface RawHotspot {
  filePath?: string;
  file_path?: string;
  description?: string;
  lastOccurred?: string;
  last_occurred?: string;
  pattern?: string;
}

interface RawHistoricalIssue {
  description?: string;
  affectedFiles?: string[];
  affected_files?: string[];
  resolvedIn?: string;
  resolved_in?: string;
  issueType?: string;
  issue_type?: string;
  recurrenceRisk?: string;
  recurrence_risk?: string;
}

interface RawIndexedContext {
  repoId?: string;
  repo_id?: string;
  indexedAt?: string;
  indexed_at?: string;
  ageInDays?: number;
  age_in_days?: number;
  relevantPatterns?: unknown[];
  relevant_patterns?: unknown[];
  historicalIssues?: unknown[];
  historical_issues?: unknown[];
  codingStandards?: unknown[];
  coding_standards?: unknown[];
  regressionHotspots?: unknown[];
  regression_hotspots?: unknown[];
}

function adaptHotspot(raw: unknown): IndexedRepoContext["regressionHotspots"][number] {
  const r = raw as RawHotspot;
  return {
    filePath: r.filePath ?? r.file_path ?? "",
    description: r.description ?? "",
    lastOccurred: r.lastOccurred ?? r.last_occurred ?? "",
    pattern: r.pattern ?? "",
  };
}

function adaptHistoricalIssue(
  raw: unknown
): IndexedRepoContext["historicalIssues"][number] {
  const r = raw as RawHistoricalIssue;
  const t = (r.issueType ?? r.issue_type ?? "bug").toLowerCase();
  const allowedT = ["bug", "security", "performance", "architecture"] as const;
  const issueType = (allowedT as readonly string[]).includes(t)
    ? (t as IndexedRepoContext["historicalIssues"][number]["issueType"])
    : "bug";
  const risk = (r.recurrenceRisk ?? r.recurrence_risk ?? "medium").toLowerCase();
  const allowedR = ["low", "medium", "high"] as const;
  const recurrenceRisk = (allowedR as readonly string[]).includes(risk)
    ? (risk as IndexedRepoContext["historicalIssues"][number]["recurrenceRisk"])
    : "medium";
  return {
    description: r.description ?? "",
    affectedFiles: r.affectedFiles ?? r.affected_files ?? [],
    resolvedIn: r.resolvedIn ?? r.resolved_in,
    issueType,
    recurrenceRisk,
  };
}

function adaptIndexedContext(raw: RawIndexedContext, repo: string): IndexedRepoContext {
  const hotspotsRaw = raw.regressionHotspots ?? raw.regression_hotspots ?? [];
  const issuesRaw = raw.historicalIssues ?? raw.historical_issues ?? [];
  const standardsRaw = (raw.codingStandards ?? raw.coding_standards ?? []) as Array<{
    rule?: string;
    scope?: string;
    rationale?: string;
  }>;
  const patternsRaw = (raw.relevantPatterns ?? raw.relevant_patterns ?? []) as Array<{
    pattern?: string;
    files?: string[];
    frequency?: string;
  }>;
  return {
    repoId: raw.repoId ?? raw.repo_id ?? repo,
    indexedAt: raw.indexedAt ?? raw.indexed_at ?? new Date().toISOString(),
    ageInDays: raw.ageInDays ?? raw.age_in_days ?? 0,
    regressionHotspots: hotspotsRaw.map(adaptHotspot),
    historicalIssues: issuesRaw.map(adaptHistoricalIssue),
    codingStandards: standardsRaw.map((s) => ({
      rule: s.rule ?? "",
      scope: s.scope ?? "",
      rationale: s.rationale,
    })),
    relevantPatterns: patternsRaw.map((p) => {
      const f = (p.frequency ?? "common").toLowerCase();
      const allowed = ["rare", "common", "universal"] as const;
      const frequency = (allowed as readonly string[]).includes(f)
        ? (f as "rare" | "common" | "universal")
        : "common";
      return {
        pattern: p.pattern ?? "",
        files: p.files ?? [],
        frequency,
      };
    }),
  };
}

export class HttpDevasignService implements DevasignService {
  constructor(private readonly cfg: DevasignServiceConfig) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const url = new URL(path, this.cfg.baseUrl).toString();
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DevAsign API ${res.status} ${path}: ${body}`);
    }
    return (await res.json()) as T;
  }

  async fetchAgentReview(repo: string, prNumber: number): Promise<AgentReview> {
    const raw = await this.req<RawAgentReview>(
      `/agent/reviews/${encodeURIComponent(repo)}/pr/${prNumber}`
    );
    return adaptAgentReview(raw, repo, prNumber);
  }

  async fetchIndexedContext(repo: string, filePaths: string[]): Promise<IndexedRepoContext> {
    const raw = await this.req<RawIndexedContext>(
      `/agent/repos/${encodeURIComponent(repo)}/index/context`,
      {
        method: "POST",
        body: JSON.stringify({
          filePaths,
          includeHotspots: true,
          includeHistory: true,
          includeStandards: true,
        }),
      }
    );
    return adaptIndexedContext(raw, repo);
  }
}

export function createDevasignService(): DevasignService {
  const baseUrl = process.env.DEVASIGN_AGENT_API_URL;
  const apiKey = process.env.DEVASIGN_AGENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("DEVASIGN_AGENT_API_URL and DEVASIGN_AGENT_API_KEY are required");
  }
  return new HttpDevasignService({ baseUrl, apiKey });
}
