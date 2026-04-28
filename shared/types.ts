export interface DimensionScore {
  score: number;
  rationale: string;
  flags: string[];
  passed: boolean;
}

export interface EvalScores {
  relevance: DimensionScore;
  accuracy: DimensionScore;
  depth: DimensionScore;
  regressionCoverage: DimensionScore;
  overall: number;
}

export interface RegressionHotspot {
  filePath: string;
  description: string;
  lastOccurred: string;
  pattern: string;
}

export interface MissedRegression {
  hotspot: RegressionHotspot;
  reason: string;
}

export interface EvalResult {
  runId: string;
  repo: string;
  prNumber: number;
  headSha: string;
  provider: "claude" | "gemini";
  evaluatedAt: string;
  scores: EvalScores;
  passed: boolean;
  regressionDetected: boolean;
  missedRegressions: MissedRegression[];
  agentReviewId: string;
  rawJudgeResponse: string;
}

export interface RepoPattern {
  pattern: string;
  files: string[];
  frequency: "rare" | "common" | "universal";
}

export interface HistoricalIssue {
  description: string;
  affectedFiles: string[];
  resolvedIn?: string;
  issueType: "bug" | "security" | "performance" | "architecture";
  recurrenceRisk: "low" | "medium" | "high";
}

export interface CodingStandard {
  rule: string;
  scope: string;
  rationale?: string;
}

export interface IndexedRepoContext {
  repoId: string;
  indexedAt: string;
  ageInDays: number;
  relevantPatterns: RepoPattern[];
  historicalIssues: HistoricalIssue[];
  codingStandards: CodingStandard[];
  regressionHotspots: RegressionHotspot[];
}

export interface AggregateStats {
  overallAvg: number;
  passRate: number;
  missedRegressions: number;
  totalEvals: number;
  previous?: {
    overallAvg: number;
    passRate: number;
    missedRegressions: number;
    totalEvals: number;
  };
  /** @deprecated use previous + client-side delta */
  trend: "up" | "down" | "flat";
}

export interface TrendDataPoint {
  date: string;
  relevance: number;
  accuracy: number;
  depth: number;
  regressionCoverage: number;
  overall: number;
}

export interface ProviderStatus {
  provider: "claude" | "gemini";
  connected: boolean;
  model: string;
}

export interface AgentReviewIssue {
  filePath: string;
  line?: number;
  severity: "info" | "low" | "medium" | "high" | "critical";
  category: "security" | "performance" | "quality" | "testing" | "architecture" | "other";
  description: string;
  suggestion?: string;
}

export interface AgentReview {
  reviewId: string;
  repo: string;
  prNumber: number;
  headSha: string;
  reviewedAt: string;
  summary: string;
  verdict: "approve" | "request_changes" | "comment";
  issues: AgentReviewIssue[];
  suggestions: string[];
}

export interface PRMetadata {
  repo: string;
  prNumber: number;
  title: string;
  author: string;
  branch: string;
  baseBranch: string;
  headSha: string;
  url: string;
  changedFiles: PRChangedFile[];
  diff: string;
}

export interface PRChangedFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface RepoSettings {
  repo: string;
  defaultProvider: "claude" | "gemini" | "auto";
  evalEnabled: boolean;
  thresholdOverrides?: Partial<typeof THRESHOLDS>;
}

export const THRESHOLDS = {
  relevance: 7,
  accuracy: 7,
  depth: 6,
  regressionCoverage: 6,
  overall: 65,
} as const;

export const DIMENSION_WEIGHTS = {
  relevance: 0.30,
  accuracy: 0.30,
  depth: 0.20,
  regressionCoverage: 0.20,
} as const;

export type DimensionKey = keyof typeof DIMENSION_WEIGHTS;
