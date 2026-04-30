import { useEffect, useMemo, useState } from "react";
import type { EvalResult } from "../../../../shared/types";
import type { RepoHotspotItem } from "../../api/repos";
import { now } from "../../utils/now";

interface Props {
  hotspots: RepoHotspotItem[];
  evals: EvalResult[];
  days?: number;
  initialRepoFilter?: string | null;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 5;

interface CellData {
  score: number;
  passed: boolean;
  prNumber: number;
  provider: "claude" | "gemini";
  date: string;
}

export function RegressionHeatmap({
  hotspots,
  evals,
  days = 30,
  initialRepoFilter = null,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const allRepos = useMemo(
    () => Array.from(new Set(hotspots.map((h) => h.repo))).sort(),
    [hotspots]
  );
  const [repoFilter, setRepoFilter] = useState<string>(
    initialRepoFilter && allRepos.includes(initialRepoFilter)
      ? initialRepoFilter
      : ""
  );
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [repoFilter]);

  const filtered = repoFilter
    ? hotspots.filter((h) => h.repo === repoFilter)
    : hotspots;

  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now());
    d.setDate(d.getDate() - i);
    dayList.push(d.toISOString().slice(0, 10));
  }

  const cells = new Map<string, CellData>();
  for (const e of evals) {
    const day = e.evaluatedAt.slice(0, 10);
    if (!dayList.includes(day)) continue;
    for (const h of filtered) {
      if (h.repo !== e.repo) continue;
      const missed = e.missedRegressions.some(
        (m) => m.hotspot.filePath === h.hotspot.filePath
      );
      const key = `${h.repo}|${h.hotspot.filePath}|${day}`;
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

  const stats = filtered.map((entry) => {
    let touches = 0;
    let caught = 0;
    for (const d of dayList) {
      const c = cells.get(`${entry.repo}|${entry.hotspot.filePath}|${d}`);
      if (!c) continue;
      touches++;
      if (c.score >= 8) caught++;
    }
    const coverage = touches === 0 ? null : caught / touches;
    return { ...entry, touches, caught, coverage };
  });

  stats.sort((a, b) => {
    if (a.coverage === null && b.coverage === null) {
      return a.repo.localeCompare(b.repo);
    }
    if (a.coverage === null) return 1;
    if (b.coverage === null) return -1;
    return a.coverage - b.coverage;
  });

  const totalRows = stats.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageRows = stats.slice(pageStart, pageStart + pageSize);
  const showingStart = totalRows === 0 ? 0 : pageStart + 1;
  const showingEnd = Math.min(pageStart + pageSize, totalRows);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-text-primary">
            Regression Heatmap
          </div>
          <div className="flex items-center gap-2">
            {allRepos.length > 1 && (
              <select
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
                className="rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-xs"
              >
                <option value="">All repos</option>
                {allRepos.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
            <div className="text-xs text-text-muted">last {days} days</div>
          </div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Each cell is one day &mdash; colored when an eval touched the file.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="h-full w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-2 text-left">File</th>
              {!repoFilter && allRepos.length > 1 && (
                <th className="px-4 py-2 text-left">Repo</th>
              )}
              <th className="px-4 py-2 text-center">Coverage</th>
              <th className="px-4 py-2 text-left">Last {days} days</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-xs text-text-muted"
                >
                  No hotspots indexed yet. Re-index a repo from Settings.
                </td>
              </tr>
            ) : (
              pageRows.map((entry) => {
                const dir = entry.hotspot.filePath
                  .split("/")
                  .slice(0, -1)
                  .join("/");
                const name = entry.hotspot.filePath.split("/").slice(-1)[0];
                return (
                  <tr
                    key={`${entry.repo}|${entry.hotspot.filePath}`}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-4 py-2 align-middle">
                      <div
                        className="font-mono text-xs text-text-primary"
                        title={entry.hotspot.filePath}
                      >
                        {name}
                      </div>
                      {dir && (
                        <div className="font-mono text-[10px] text-text-muted">
                          {dir}
                        </div>
                      )}
                    </td>
                    {!repoFilter && allRepos.length > 1 && (
                      <td className="px-4 py-2 align-middle">
                        <span className="font-mono text-[11px] text-text-secondary">
                          {entry.repo}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2 text-center align-middle">
                      {entry.touches === 0 ? (
                        <span className="font-mono text-xs text-text-muted">
                          &mdash;
                        </span>
                      ) : (
                        <span
                          className={`font-mono text-xs ${
                            entry.coverage! >= 0.8
                              ? "text-pass"
                              : entry.coverage! >= 0.5
                                ? "text-warn"
                                : "text-fail"
                          }`}
                        >
                          {entry.caught}/{entry.touches}
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
                          const c = cells.get(
                            `${entry.repo}|${entry.hotspot.filePath}|${d}`
                          );
                          return (
                            <div
                              key={d}
                              className="h-3 rounded-sm"
                              style={{ background: cellColor(c) }}
                              title={
                                c
                                  ? `${d} • ${entry.repo} PR#${c.prNumber} • ${c.provider} • score ${c.score.toFixed(1)}`
                                  : `${d} — not touched`
                              }
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
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
        {totalRows > pageSize && (
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {showingStart}-{showingEnd} of {totalRows}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-text-secondary hover:border-primary disabled:opacity-30"
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-text-secondary hover:border-primary disabled:opacity-30"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
