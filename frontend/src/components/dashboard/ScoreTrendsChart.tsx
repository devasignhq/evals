import { useState } from "react";
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

export function ScoreTrendsChart({ points }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    relevance: true,
    accuracy: true,
    depth: true,
    regressionCoverage: true,
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-text-primary">Score Trends</div>
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
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#2e2e2e" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#525252"
              tick={{ fontSize: 11, fontFamily: "Ubuntu Mono" }}
            />
            <YAxis
              domain={[0, 10]}
              stroke="#525252"
              tick={{ fontSize: 11, fontFamily: "Ubuntu Mono" }}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid #2e2e2e",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "Ubuntu",
              }}
            />
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
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
