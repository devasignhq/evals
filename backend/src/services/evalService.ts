import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { EvalResult, IndexedRepoContext } from "../../../shared/types.js";
import { getDb } from "../db/client.js";
import { evalResults, repoSettings } from "../db/schema.js";
import type { DevasignService } from "./devasignService.js";
import type { GithubService } from "./githubService.js";
import { buildEvalResult, runJudge } from "./judgeService.js";
import {
  defaultProvider,
  providerFromEnv,
} from "./providers/factory.js";
import type { ProviderName } from "./providers/types.js";

export interface RunEvalInput {
  repo: string;
  prNumber: number;
  installationId: number;
  provider?: ProviderName;
  agentReviewIdHint?: string;
  headShaHint?: string;
}

export interface EvalServiceDeps {
  devasign: DevasignService;
  github: GithubService;
}

async function resolveProvider(
  repo: string,
  override?: ProviderName
): Promise<ProviderName> {
  if (override) return override;
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(repoSettings)
      .where(eq(repoSettings.repo, repo))
      .limit(1);
    const row = rows[0];
    if (row && row.defaultProvider !== "auto") {
      if (row.defaultProvider === "claude" || row.defaultProvider === "gemini") {
        return row.defaultProvider;
      }
    }
  } catch {
    // db may be unavailable in dev — fall through to env default
  }
  return defaultProvider();
}

async function persistEvalResult(result: EvalResult) {
  const db = getDb();
  await db.insert(evalResults).values({
    runId: result.runId,
    repo: result.repo,
    prNumber: result.prNumber,
    headSha: result.headSha,
    provider: result.provider,
    agentReviewId: result.agentReviewId,
    evaluatedAt: new Date(result.evaluatedAt),
    passed: result.passed,
    regressionDetected: result.regressionDetected,
    overallScore: result.scores.overall,
    relevanceScore: result.scores.relevance.score,
    accuracyScore: result.scores.accuracy.score,
    depthScore: result.scores.depth.score,
    regressionScore: result.scores.regressionCoverage.score,
    scores: result.scores,
    missedRegressions: result.missedRegressions,
    rawJudgeResponse: result.rawJudgeResponse,
  });
}

export async function runEval(
  deps: EvalServiceDeps,
  input: RunEvalInput
): Promise<EvalResult> {
  const providerName = await resolveProvider(input.repo, input.provider);
  const judge = providerFromEnv(providerName);

  const pr = await deps.github.fetchPRMetadata(input.repo, input.prNumber);

  const agentReview = await deps.devasign.fetchAgentReview({
    installationId: input.installationId,
    repo: input.repo,
    prNumber: input.prNumber,
  });

  const context: IndexedRepoContext = {
    repoId: input.repo,
    indexedAt: new Date().toISOString(),
    ageInDays: 0,
    relevantPatterns: [],
    historicalIssues: [],
    codingStandards: [],
    regressionHotspots: [],
  };

  const judged = await runJudge(judge, { pr, agentReview, context });

  const result = buildEvalResult(judged, {
    runId: `run_${randomUUID()}`,
    repo: input.repo,
    prNumber: input.prNumber,
    headSha: input.headShaHint ?? pr.headSha,
    provider: providerName,
    agentReviewId: input.agentReviewIdHint ?? agentReview.reviewId,
    evaluatedAt: new Date().toISOString(),
  });

  await persistEvalResult(result);
  return result;
}
