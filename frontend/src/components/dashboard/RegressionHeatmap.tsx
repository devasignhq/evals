import type { EvalResult, RegressionHotspot } from "../../../../shared/types";

interface Props {
  hotspots: RegressionHotspot[];
  evals: EvalResult[];
  days?: number;
}

interface CellData {
  score: number;
  passed: boolean;
  prNumber: number;
  provider: "claude" | "gemini";
  date: string;
}

export function RegressionHeatmap({ hotspots, evals, days = 30 }: Props) {
  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayList.push(d.toISOString().slice(0, 10));
  }

  const cells = new Map<string, CellData>();
  for (const e of evals) {
    const day = e.evaluatedAt.slice(0, 10);
    if (!dayList.includes(day)) continue;
    // Touched hotspot if a missed regression is recorded against it OR
    // hotspot file appears in regressionCoverage flags. For mock simplicity:
    // mark all hotspots as "touched" by an eval if its regression score > 0.
    for (const h of hotspots) {
      const missed = e.missedRegressions.some(
        (m) => m.hotspot.filePath === h.filePath
      );
      const key = `${h.filePath}|${day}`;
      if (missed) {
        cells.set(key, {
          score: 0,
          passed: false,
          prNumber: e.prNumber,
          provider: e.provider,
          date: day,
        });
      } else if (!cells.has(key)) {
        cells.set(key, {
          score: e.scores.regressionCoverage.score,
          passed: e.scores.regressionCoverage.passed,
          prNumber: e.prNumber,
          provider: e.provider,
          date: day,
        });
      }
    }
  }

  function color(c?: CellData) {
    if (!c) return "#1a1a1a";
    if (c.score === 0) return "#ef4444";
    if (c.score >= 8) return "#22c55e";
    if (c.score >= 6) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 text-sm font-medium text-text-primary">
        Regression Heatmap{" "}
        <span className="text-xs text-text-muted">last {days} days</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px]">
          <tbody>
            {hotspots.map((h) => (
              <tr key={h.filePath}>
                <td className="pr-3 text-right font-mono text-[11px] text-text-secondary">
                  {h.filePath.split("/").slice(-1)[0]}
                </td>
                {dayList.map((d) => {
                  const c = cells.get(`${h.filePath}|${d}`);
                  return (
                    <td key={d} className="p-0">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ background: color(c) }}
                        title={
                          c
                            ? `${h.filePath}\n${d} • PR#${c.prNumber} • ${c.provider} • score ${c.score.toFixed(1)}`
                            : `${h.filePath}\n${d} — not touched`
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-pass" /> covered
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-warn" /> partial
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-fail" /> missed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-surface border border-border" />{" "}
          not touched
        </span>
      </div>
    </div>
  );
}
