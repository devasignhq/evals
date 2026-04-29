import type {
  AggregateStats,
  EvalResult,
  TrendDataPoint,
} from "../../../shared/types";
import { api, buildQuery, USE_MOCK } from "./client";
import {
  mockAggregate,
  mockEvalDetail,
  mockEvals,
  mockTrends,
  MOCK_EVALS,
} from "./mock";

export interface EvalListFilters {
  repo?: string;
  provider?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listEvals(
  filters: EvalListFilters
): Promise<{ items: EvalResult[]; page: number; limit: number; total: number }> {
  if (USE_MOCK) return mockEvals(filters);
  return api(`/v1/evals${buildQuery({ ...filters })}`);
}

export async function getAggregate(filters: {
  repo?: string;
  from?: string;
  to?: string;
}): Promise<AggregateStats> {
  if (USE_MOCK) return mockAggregate(filters);
  return api(`/v1/evals/aggregate${buildQuery(filters)}`);
}

export async function getTrends(filters: {
  repo?: string;
  from?: string;
  to?: string;
}): Promise<{ points: TrendDataPoint[] }> {
  if (USE_MOCK) return mockTrends(filters);
  return api(`/v1/evals/trends${buildQuery(filters)}`);
}

export async function getEvalDetail(
  repo: string,
  prNumber: number
): Promise<EvalResult> {
  if (USE_MOCK) {
    const found = mockEvalDetail(repo, prNumber);
    if (!found) throw new Error("Eval not found");
    return found;
  }
  // backend keys by runId; fetch list filtered by repo and find matching PR
  const res = await listEvals({ repo, limit: 100 });
  const found = res.items.find((e) => e.prNumber === prNumber);
  if (!found) throw new Error("Eval not found");
  return found;
}

export async function getEvalByRunId(runId: string): Promise<EvalResult> {
  if (USE_MOCK) {
    const found = MOCK_EVALS.find((e) => e.runId === runId);
    if (!found) throw new Error("Eval not found");
    return found;
  }
  return api(`/v1/evals/${runId}`);
}

export async function triggerEval(input: {
  repo: string;
  prNumber: number;
  installationId: number;
  provider?: "claude" | "gemini";
}): Promise<EvalResult> {
  if (USE_MOCK) {
    return {
      runId: `run_mock_${Date.now()}`,
      repo: input.repo,
      prNumber: input.prNumber,
      headSha: "0000000",
      provider: input.provider ?? "claude",
      evaluatedAt: new Date().toISOString(),
      scores: {
        relevance: { score: 7.5, rationale: "ok", flags: [], passed: true },
        accuracy: { score: 7.5, rationale: "ok", flags: [], passed: true },
        depth: { score: 7.0, rationale: "ok", flags: [], passed: true },
        regressionCoverage: { score: 6.5, rationale: "ok", flags: [], passed: true },
        overall: 73,
      },
      passed: true,
      regressionDetected: false,
      missedRegressions: [],
      agentReviewId: "rev_mock",
      rawJudgeResponse: "{}",
    };
  }
  return api<EvalResult>("/v1/evals/trigger", { method: "POST", json: input });
}
