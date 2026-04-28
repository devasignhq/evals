import type {
  AgentReview,
  EvalResult,
  EvalScores,
  IndexedRepoContext,
  MissedRegression,
  PRMetadata,
  RegressionHotspot,
} from "../../../shared/types.js";
import { DIMENSION_WEIGHTS, THRESHOLDS } from "../../../shared/types.js";
import type { JudgeProvider } from "./providers/types.js";

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator of AI-generated code reviews.
Score the agent's review across four dimensions on a 0-10 scale:

- relevance: do the comments target the actual changes in this PR?
- accuracy: are the claims technically correct? Any false positives or hallucinations?
- depth: does the review go beyond surface-level nits? Does it engage with logic and design?
- regressionCoverage: were known regression hotspots and historical issues addressed?

You will receive: PR metadata + diff, the agent's review, and indexed repo context (hotspots, history).

Respond in this strict JSON shape and nothing else:

{
  "relevance": { "score": <0-10>, "rationale": "<one sentence>", "flags": ["..."] },
  "accuracy": { "score": <0-10>, "rationale": "<one sentence>", "flags": ["..."] },
  "depth": { "score": <0-10>, "rationale": "<one sentence>", "flags": ["..."] },
  "regressionCoverage": { "score": <0-10>, "rationale": "<one sentence>", "flags": ["..."] },
  "missedRegressions": [
    { "filePath": "<path>", "reason": "<why this hotspot was missed>" }
  ]
}

Use missedRegressions only for hotspots from the indexed context that the agent failed to mention.
flags is an array of short tags like "false-positive", "hallucination", "shallow", "missed-hotspot".`;

interface RawDimension {
  score: number;
  rationale: string;
  flags?: string[];
}

interface RawJudgement {
  relevance: RawDimension;
  accuracy: RawDimension;
  depth: RawDimension;
  regressionCoverage: RawDimension;
  missedRegressions?: { filePath: string; reason: string }[];
}

export interface JudgeInput {
  pr: PRMetadata;
  agentReview: AgentReview;
  context: IndexedRepoContext;
}

export interface JudgeOutput {
  scores: EvalScores;
  passed: boolean;
  regressionDetected: boolean;
  missedRegressions: MissedRegression[];
  rawJudgeResponse: string;
}

function buildUserPrompt(input: JudgeInput): string {
  const { pr, agentReview, context } = input;
  return [
    `# PR Metadata`,
    `Repo: ${pr.repo}`,
    `PR #${pr.prNumber}: ${pr.title}`,
    `Author: ${pr.author}`,
    `Branch: ${pr.branch} → ${pr.baseBranch}`,
    `Head SHA: ${pr.headSha}`,
    ``,
    `# Changed Files (${pr.changedFiles.length})`,
    ...pr.changedFiles.map(
      (f) => `- ${f.status} ${f.filename} (+${f.additions}/-${f.deletions})`
    ),
    ``,
    `# Diff`,
    "```diff",
    pr.diff.slice(0, 12000),
    "```",
    ``,
    `# Agent Review`,
    `Verdict: ${agentReview.verdict}`,
    `Summary: ${agentReview.summary}`,
    ``,
    `Issues raised by the agent:`,
    ...agentReview.issues.map(
      (i) =>
        `- [${i.severity}/${i.category}] ${i.filePath}${i.line ? `:${i.line}` : ""} — ${i.description}${
          i.suggestion ? ` (suggestion: ${i.suggestion})` : ""
        }`
    ),
    ``,
    `Suggestions:`,
    ...agentReview.suggestions.map((s) => `- ${s}`),
    ``,
    `# Indexed Repo Context`,
    `Index age: ${context.ageInDays} days`,
    ``,
    `Regression Hotspots:`,
    ...context.regressionHotspots.map(
      (h) => `- ${h.filePath}: ${h.description} (last: ${h.lastOccurred}, pattern: ${h.pattern})`
    ),
    ``,
    `Historical Issues:`,
    ...context.historicalIssues.map(
      (h) =>
        `- [${h.issueType}/${h.recurrenceRisk}] ${h.description} — files: ${h.affectedFiles.join(", ")}`
    ),
    ``,
    `Coding Standards:`,
    ...context.codingStandards.map((s) => `- (${s.scope}) ${s.rule}`),
    ``,
    `Now produce your JSON judgement.`,
  ].join("\n");
}

function extractJson(raw: string): RawJudgement {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0) {
    throw new Error("Judge response did not contain a JSON object");
  }
  const slice = candidate.slice(start, end + 1);
  return JSON.parse(slice) as RawJudgement;
}

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(10, x));
}

function dim(raw: RawDimension, threshold: number) {
  const score = clampScore(raw?.score);
  return {
    score,
    rationale: raw?.rationale ?? "",
    flags: Array.isArray(raw?.flags) ? raw.flags : [],
    passed: score >= threshold,
  };
}

export function weightedOverall(s: {
  relevance: number;
  accuracy: number;
  depth: number;
  regressionCoverage: number;
}): number {
  const w = DIMENSION_WEIGHTS;
  const composite =
    s.relevance * w.relevance +
    s.accuracy * w.accuracy +
    s.depth * w.depth +
    s.regressionCoverage * w.regressionCoverage;
  return Math.round(composite * 10);
}

function matchHotspot(
  filePath: string,
  hotspots: RegressionHotspot[]
): RegressionHotspot {
  return (
    hotspots.find((h) => h.filePath === filePath) ?? {
      filePath,
      description: "Hotspot referenced by judge but not in indexed context",
      lastOccurred: "unknown",
      pattern: "unknown",
    }
  );
}

export async function runJudge(
  provider: JudgeProvider,
  input: JudgeInput
): Promise<JudgeOutput> {
  const userPrompt = buildUserPrompt(input);
  const raw = await provider.judge(userPrompt, JUDGE_SYSTEM_PROMPT);
  const parsed = extractJson(raw);

  const relevance = dim(parsed.relevance, THRESHOLDS.relevance);
  const accuracy = dim(parsed.accuracy, THRESHOLDS.accuracy);
  const depth = dim(parsed.depth, THRESHOLDS.depth);
  const regressionCoverage = dim(
    parsed.regressionCoverage,
    THRESHOLDS.regressionCoverage
  );

  const overall = weightedOverall({
    relevance: relevance.score,
    accuracy: accuracy.score,
    depth: depth.score,
    regressionCoverage: regressionCoverage.score,
  });

  const scores: EvalScores = {
    relevance,
    accuracy,
    depth,
    regressionCoverage,
    overall,
  };

  const missedRegressions: MissedRegression[] = (parsed.missedRegressions ?? []).map((m) => ({
    hotspot: matchHotspot(m.filePath, input.context.regressionHotspots),
    reason: m.reason,
  }));

  const passed =
    relevance.passed &&
    accuracy.passed &&
    depth.passed &&
    regressionCoverage.passed &&
    overall >= THRESHOLDS.overall;

  return {
    scores,
    passed,
    regressionDetected: missedRegressions.length > 0,
    missedRegressions,
    rawJudgeResponse: raw,
  };
}

export function buildEvalResult(
  output: JudgeOutput,
  meta: {
    runId: string;
    repo: string;
    prNumber: number;
    headSha: string;
    provider: "claude" | "gemini";
    agentReviewId: string;
    evaluatedAt: string;
  }
): EvalResult {
  return {
    runId: meta.runId,
    repo: meta.repo,
    prNumber: meta.prNumber,
    headSha: meta.headSha,
    provider: meta.provider,
    evaluatedAt: meta.evaluatedAt,
    scores: output.scores,
    passed: output.passed,
    regressionDetected: output.regressionDetected,
    missedRegressions: output.missedRegressions,
    agentReviewId: meta.agentReviewId,
    rawJudgeResponse: output.rawJudgeResponse,
  };
}
