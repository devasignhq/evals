import type { AgentReview } from "../../../shared/types.js";

export interface DevasignService {
  fetchAgentReview(input: {
    installationId: string;
    repo: string;
    prNumber: number;
  }): Promise<AgentReview>;
}

interface DevasignServiceConfig {
  baseUrl: string;
}

interface RawSuggestion {
  file?: string | null;
  lineNumber?: number;
  type?: string;
  severity?: string;
  description?: string;
  suggestedCode?: string;
  language?: string;
  reasoning?: string;
}

interface RawReviewResult {
  id?: string;
  installationId?: string;
  prNumber?: number;
  repositoryName?: string;
  mergeScore?: number;
  reviewStatus?: string;
  summary?: string;
  confidence?: number;
  processingTime?: number;
  createdAt?: string;
  suggestions?: RawSuggestion[];
}

interface ManualAnalysisEnvelope {
  success?: boolean;
  message?: string;
  data?: {
    prData?: unknown;
    reviewResult?: RawReviewResult;
  };
}

function mapVerdict(reviewStatus: string | undefined): AgentReview["verdict"] {
  const s = (reviewStatus ?? "").toUpperCase();
  if (s === "APPROVED") return "approve";
  if (s === "CHANGES_REQUESTED") return "request_changes";
  return "comment";
}

function mapCategory(type: string | undefined): AgentReview["issues"][number]["category"] {
  const t = (type ?? "").toLowerCase();
  if (t === "optimization") return "performance";
  if (t === "fix" || t === "improvement" || t === "style") return "quality";
  return "other";
}

function mapSeverity(
  severity: string | undefined
): AgentReview["issues"][number]["severity"] {
  const s = (severity ?? "medium").toLowerCase();
  const allowed = ["info", "low", "medium", "high", "critical"] as const;
  return (allowed as readonly string[]).includes(s)
    ? (s as AgentReview["issues"][number]["severity"])
    : "medium";
}

function suggestionToIssue(s: RawSuggestion): AgentReview["issues"][number] {
  return {
    filePath: s.file ?? "",
    line: s.lineNumber,
    severity: mapSeverity(s.severity),
    category: mapCategory(s.type),
    description: s.description ?? "",
    suggestion: s.suggestedCode ?? s.reasoning,
  };
}

function suggestionToText(s: RawSuggestion): string {
  const loc = s.file ? `${s.file}${s.lineNumber ? `:${s.lineNumber}` : ""}: ` : "";
  return `${loc}${s.description ?? ""}${s.reasoning ? ` — ${s.reasoning}` : ""}`;
}

function adaptReviewResult(
  rr: RawReviewResult,
  repo: string,
  prNumber: number
): AgentReview {
  const suggestions = Array.isArray(rr.suggestions) ? rr.suggestions : [];
  return {
    reviewId: rr.id ?? `rev_${repo}_${prNumber}`,
    repo: rr.repositoryName ?? repo,
    prNumber: rr.prNumber ?? prNumber,
    headSha: "",
    reviewedAt: rr.createdAt ?? new Date().toISOString(),
    summary: rr.summary ?? "",
    verdict: mapVerdict(rr.reviewStatus),
    issues: suggestions.map(suggestionToIssue),
    suggestions: suggestions.map(suggestionToText),
  };
}

export class HttpDevasignService implements DevasignService {
  constructor(private readonly cfg: DevasignServiceConfig) {}

  async fetchAgentReview(input: {
    installationId: string;
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
        resultOnly: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `DevAsign API ${res.status} /test/ai-services/github/manual-analysis: ${body}`
      );
    }
    const envelope = (await res.json()) as ManualAnalysisEnvelope;
    const reviewResult = envelope?.data?.reviewResult;
    if (!reviewResult) {
      throw new Error(
        `DevAsign API returned 200 but no data.reviewResult (success=${envelope?.success}, message=${envelope?.message ?? ""})`
      );
    }
    return adaptReviewResult(reviewResult, input.repo, input.prNumber);
  }
}

export function createDevasignService(): DevasignService {
  const baseUrl = process.env.DEVASIGN_AGENT_API_URL;
  if (!baseUrl) {
    throw new Error("DEVASIGN_AGENT_API_URL is required");
  }
  return new HttpDevasignService({ baseUrl });
}
