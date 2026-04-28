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

  function cellColor(c?: CellData) {
    if (!c) return "#3a3a3a";
    if (c.score === 0) return "#ef4444";
    if (c.score >= 8) return "#22c55e";
    if (c.score >= 6) return "#f59e0b";
    return "#ef4444";
  }

  const stats = hotspots.map((h) => {
    let touches = 0;
    let caught = 0;
    for (const d of dayList) {
      const c = cells.get(`${h.filePath}|${d}`);
      if (!c) continue;
      touches++;
      if (c.score >= 8) caught++;
    }
    const coverage = touches === 0 ? null : caught / touches;
    return { hotspot: h, touches, caught, coverage };
  });

  stats.sort((a, b) => {
    if (a.coverage === null && b.coverage === null) return 0;
    if (a.coverage === null) return 1;
    if (b.coverage === null) return -1;
    return a.coverage - b.coverage;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-text-primary">
            Regression Heatmap
          </div>
          <div className="text-xs text-text-muted">last {days} days</div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Each cell is one day &mdash; colored when an eval touched the file.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="h-full w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-center">Coverage</th>
              <th className="px-4 py-2 text-left">Last {days} days</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ hotspot: h, touches, caught, coverage }) => {
              const dir = h.filePath.split("/").slice(0, -1).join("/");
              const name = h.filePath.split("/").slice(-1)[0];
              return (
                <tr
                  key={h.filePath}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <td className="px-4 py-2 align-middle">
                    <div
                      className="font-mono text-xs text-text-primary"
                      title={h.filePath}
                    >
                      {name}
                    </div>
                    {dir && (
                      <div className="font-mono text-[10px] text-text-muted">
                        {dir}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    {touches === 0 ? (
                      <span className="font-mono text-xs text-text-muted">
                        &mdash;
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-xs ${coverage! >= 0.8
                            ? "text-pass"
                            : coverage! >= 0.5
                              ? "text-warn"
                              : "text-fail"
                          }`}
                      >
                        {caught}/{touches}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <div
                      className="inline-grid"
                      style={{
                        gridTemplateColumns: `repeat(${days}, 8px)`,
                        columnGap: "2px",
                      }}
                    >
                      {dayList.map((d) => {
                        const c = cells.get(`${h.filePath}|${d}`);
                        return (
                          <div
                            key={d}
                            className="h-3 rounded-sm"
                            style={{ background: cellColor(c) }}
                            title={
                              c
                                ? `${d} • PR#${c.prNumber} • ${c.provider} • score ${c.score.toFixed(1)}`
                                : `${d} — not touched`
                            }
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-pass" /> caught
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-warn" /> partial
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-fail" /> missed
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: "#3a3a3a" }}
          />{" "}
          not touched
        </span>
      </div>
    </div>
  );
}
