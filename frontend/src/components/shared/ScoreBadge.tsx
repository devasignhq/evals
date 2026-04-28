import type { DimensionKey } from "../../../../shared/types";
import { scoreTier } from "../../utils/scores";

interface Props {
  score: number;
  dimension: DimensionKey | "overall";
  className?: string;
}

const TIER_STYLES = {
  good: "bg-[rgba(34,197,94,0.08)] text-pass border-[#166534]",
  warn: "bg-[rgba(245,158,11,0.08)] text-warn border-[#92400e]",
  fail: "bg-[rgba(239,68,68,0.08)] text-fail border-[#7f1d1d]",
} as const;

export function ScoreBadge({ score, dimension, className = "" }: Props) {
  const tier = scoreTier(score, dimension);
  const display = dimension === "overall" ? Math.round(score) : score.toFixed(1);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-mono font-bold ${TIER_STYLES[tier]} ${className}`}
    >
      {display}
    </span>
  );
}
