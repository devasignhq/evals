import type { AgentReview } from "../../../shared/types.js";

export interface DevasignService {
  fetchAgentReview(input: {
    installationId: number;
    repo: string;
    prNumber: number;
  }): Promise<AgentReview>;
}

interface DevasignServiceConfig {
  baseUrl: string;
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

// May need adjustment once a real manual-analysis response is observed.
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

export class HttpDevasignService implements DevasignService {
  constructor(private readonly cfg: DevasignServiceConfig) {}

  async fetchAgentReview(input: {
    installationId: number;
    repo: string;
    prNumber: number;
  }): Promise<AgentReview> {
    const url = new URL(
      "/test/ai-services/github/manual-analysis",
      this.cfg.baseUrl
    ).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installationId: input.installationId,
        repositoryName: input.repo,
        prNumber: input.prNumber,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `DevAsign API ${res.status} /test/ai-services/github/manual-analysis: ${body}`
      );
    }
    const raw = (await res.json()) as RawAgentReview;
    return adaptAgentReview(raw, input.repo, input.prNumber);
  }
}

export function createDevasignService(): DevasignService {
  const baseUrl = process.env.DEVASIGN_AGENT_API_URL;
  if (!baseUrl) {
    throw new Error("DEVASIGN_AGENT_API_URL is required");
  }
  return new HttpDevasignService({ baseUrl });
}
