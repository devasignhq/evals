import { DIMENSION_WEIGHTS, THRESHOLDS } from "../../../shared/types";
import type { DimensionKey } from "../../../shared/types";

export function scorePassed(score: number, key: DimensionKey | "overall"): boolean {
  const t = THRESHOLDS[key];
  return score >= t;
}

export type ScoreTier = "good" | "warn" | "fail";

export function scoreTier(score: number, key: DimensionKey | "overall"): ScoreTier {
  const t = THRESHOLDS[key];
  if (key === "overall") {
    if (score >= t + 15) return "good";
    if (score >= t) return "warn";
    return "fail";
  }
  if (score >= t + 2) return "good";
  if (score >= t) return "warn";
  return "fail";
}

export function scoreColor(tier: ScoreTier): string {
  if (tier === "good") return "#22c55e";
  if (tier === "warn") return "#f59e0b";
  return "#ef4444";
}

export function weightedOverall(s: {
  relevance: number;
  accuracy: number;
  depth: number;
  regressionCoverage: number;
}): number {
  const w = DIMENSION_WEIGHTS;
  return Math.round(
    (s.relevance * w.relevance +
      s.accuracy * w.accuracy +
      s.depth * w.depth +
      s.regressionCoverage * w.regressionCoverage) *
      10
  );
}
