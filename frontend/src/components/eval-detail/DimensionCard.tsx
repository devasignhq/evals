import type { DimensionKey, DimensionScore } from "../../../../shared/types";
import { ScoreGauge } from "../shared/ScoreGauge";

interface Props {
  dimension: DimensionKey;
  data: DimensionScore;
  icon: string;
  title: string;
}

export function DimensionCard({ dimension, data, icon, title }: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-4">
        <ScoreGauge score={data.score} dimension={dimension} size="md" showLabel={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-text-muted">{icon}</span>
            <h3 className="text-sm font-medium tracking-tight">{title}</h3>
          </div>
          <p className="mt-2 text-sm text-text-secondary">{data.rationale}</p>
          {data.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {data.flags.map((f) => (
                <span
                  key={f}
                  className="rounded-md border border-[#7f1d1d] bg-[rgba(239,68,68,0.08)] px-1.5 py-0.5 font-mono text-[10px] text-fail"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
