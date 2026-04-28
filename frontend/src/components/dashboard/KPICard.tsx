import { Sparkline } from "../shared/Sparkline";

type Direction = "higher-better" | "lower-better" | "neutral";

interface Props {
  label: string;
  value: string | number;
  delta?: { value: number; label: string };
  spark?: number[];
  sparkColor?: string;
  direction?: Direction;
}

function deltaColor(value: number, direction: Direction): string {
  if (direction === "neutral" || value === 0) return "text-text-muted";
  const isGood =
    direction === "higher-better" ? value > 0 : value < 0;
  return isGood ? "text-pass" : "text-fail";
}

export function KPICard({
  label,
  value,
  delta,
  spark,
  sparkColor,
  direction = "higher-better",
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-mono text-3xl font-bold text-text-primary">{value}</div>
        {spark && <Sparkline values={spark} color={sparkColor} />}
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className={deltaColor(delta.value, direction)}>
            {delta.value > 0 ? "▲" : delta.value < 0 ? "▼" : "─"}{" "}
            {Math.abs(delta.value).toFixed(1)}
          </span>
          <span className="text-text-muted">{delta.label}</span>
        </div>
      )}
    </div>
  );
}
