import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EvalResult } from "../../../../shared/types";
import { ProviderBadge } from "../shared/ProviderBadge";
import { ScoreBadge } from "../shared/ScoreBadge";
import { formatDateTime, formatSha } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

interface Props {
  items: EvalResult[];
}

const selectClass =
  "rounded border border-border bg-elevated px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none";

export function RecentEvalsTable({ items }: Props) {
  const [repoFilter, setRepoFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  const repos = useMemo(
    () => Array.from(new Set(items.map((e) => e.repo))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    let out = items;
    if (repoFilter !== "all") out = out.filter((e) => e.repo === repoFilter);
    if (providerFilter !== "all") out = out.filter((e) => e.provider === providerFilter);
    if (statusFilter === "pass") out = out.filter((e) => e.passed);
    if (statusFilter === "fail") out = out.filter((e) => !e.passed);
    return out;
  }, [items, repoFilter, providerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-sm font-medium">Recent Evals</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={repoFilter}
            onChange={handleFilter(setRepoFilter)}
            className={selectClass}
          >
            <option value="all">All repos</option>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={handleFilter(setProviderFilter)}
            className={selectClass}
          >
            <option value="all">All providers</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <select
            value={statusFilter}
            onChange={handleFilter(setStatusFilter)}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as PageSize);
              setPage(1);
            }}
            className={selectClass}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-2 text-left">Repo</th>
              <th className="px-4 py-2 text-left">PR</th>
              <th className="px-4 py-2 text-left">Provider</th>
              <th className="px-4 py-2 text-center">Overall</th>
              <th className="px-4 py-2 text-center">Rel</th>
              <th className="px-4 py-2 text-center">Acc</th>
              <th className="px-4 py-2 text-center">Depth</th>
              <th className="px-4 py-2 text-center">Reg</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-text-muted">
                  No evals match the selected filters.
                </td>
              </tr>
            ) : (
              pageItems.map((e) => {
                const [org, name] = e.repo.split("/");
                return (
                  <tr
                    key={e.runId}
                    className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-elevated"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                      {e.repo}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        to={`/eval/${org}/${name}/${e.prNumber}`}
                        className="font-mono text-xs text-primary hover:text-primary-hover"
                      >
                        #{e.prNumber}
                      </Link>
                      <span className="ml-2 font-mono text-[10px] text-text-muted">
                        {formatSha(e.headSha)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <ProviderBadge provider={e.provider} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ScoreBadge score={e.scores.overall} dimension="overall" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ScoreBadge score={e.scores.relevance.score} dimension="relevance" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ScoreBadge score={e.scores.accuracy.score} dimension="accuracy" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ScoreBadge score={e.scores.depth.score} dimension="depth" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ScoreBadge
                        score={e.scores.regressionCoverage.score}
                        dimension="regressionCoverage"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`font-mono text-xs ${e.passed ? "text-pass" : "text-fail"}`}
                      >
                        {e.passed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                      {formatDateTime(e.evaluatedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-text-secondary">
        <span>
          {filtered.length === 0
            ? "0 results"
            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="rounded px-2 py-1 transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded px-2 py-1 transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
            .reduce<(number | "…")[]>((acc, n, i, arr) => {
              if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-text-muted">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`min-w-[28px] rounded px-2 py-1 transition-colors ${
                    safePage === n
                      ? "bg-primary text-white"
                      : "hover:bg-elevated"
                  }`}
                >
                  {n}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded px-2 py-1 transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="rounded px-2 py-1 transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
