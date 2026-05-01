import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendDataPoint } from "../../../../shared/types";

const SERIES = [
  { key: "relevance", color: "#60a5fa", label: "Relevance" },
  { key: "accuracy", color: "#22c55e", label: "Accuracy" },
  { key: "depth", color: "#f59e0b", label: "Depth" },
  { key: "regressionCoverage", color: "#ef4444", label: "Regression" },
] as const;

interface Props {
  points: TrendDataPoint[];
}

function formatTick(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTooltipTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface RechartsTooltipPayload {
  payload: TrendDataPoint;
}

function TrendsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface p-3 text-xs shadow-lg">
      <div className="mb-1 font-mono text-text-secondary">
        {formatTooltipTime(p.date)}
      </div>
      <div className="mb-2 font-medium text-text-primary">
        {p.repo} <span className="font-mono text-text-secondary">#{p.prNumber}</span>
        <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
          {p.provider}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-text-secondary">{s.label}</span>
            <span className="ml-auto font-mono text-text-primary">
              {p[s.key].toFixed(1)}
            </span>
          </div>
        ))}
        <div className="col-span-2 mt-1 flex items-center gap-1.5 border-t border-border pt-1">
          <span className="text-text-secondary">Overall</span>
          <span className="ml-auto font-mono text-text-primary">
            {p.overall.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ScoreTrendsChart({ points }: Props) {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    relevance: true,
    accuracy: true,
    depth: true,
    regressionCoverage: true,
  });

  const handleDotClick = (data: { payload?: TrendDataPoint }) => {
    const p = data?.payload;
    if (!p) return;
    const [org, name] = p.repo.split("/");
    if (!org || !name) return;
    navigate(`/eval/${org}/${name}/${p.prNumber}`);
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-text-primary">Score Trends</div>
          <div className="text-xs text-text-muted">
            One point per eval · click a dot to open
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {SERIES.map((s) => (
            <button
              key={s.key}
              onClick={() => setEnabled((e) => ({ ...e, [s.key]: !e[s.key] }))}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-opacity ${
                enabled[s.key]
                  ? "border-border bg-elevated"
                  : "border-border bg-surface opacity-40"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#2e2e2e" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#525252"
              tick={{ fontSize: 11, fontFamily: "Ubuntu Mono" }}
              tickFormatter={formatTick}
              minTickGap={32}
            />
            <YAxis
              domain={[0, 10]}
              stroke="#525252"
              tick={{ fontSize: 11, fontFamily: "Ubuntu Mono" }}
            />
            <Tooltip content={<TrendsTooltip />} />
            <Legend wrapperStyle={{ display: "none" }} />
            {SERIES.map(
              (s) =>
                enabled[s.key] && (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 3, cursor: "pointer" }}
                    activeDot={{ r: 5, cursor: "pointer", onClick: handleDotClick }}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
