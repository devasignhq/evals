import type { EvalScores } from "../../../../shared/types";
import { DimensionCard } from "./DimensionCard";

interface Props {
  scores: EvalScores;
}

export function ScoreBreakdown({ scores }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DimensionCard
        dimension="relevance"
        data={scores.relevance}
        icon="◉"
        title="Relevance"
      />
      <DimensionCard
        dimension="accuracy"
        data={scores.accuracy}
        icon="✓"
        title="Accuracy"
      />
      <DimensionCard
        dimension="depth"
        data={scores.depth}
        icon="↧"
        title="Depth"
      />
      <DimensionCard
        dimension="regressionCoverage"
        data={scores.regressionCoverage}
        icon="⚠"
        title="Regression Coverage"
      />
    </div>
  );
}
