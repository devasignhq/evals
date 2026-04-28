import { Link } from "react-router-dom";
import type { EvalResult } from "../../../../shared/types";
import { ProviderBadge } from "../shared/ProviderBadge";
import { ScoreBadge } from "../shared/ScoreBadge";
import { formatDateTime, formatSha } from "../../utils/format";

interface Props {
  items: EvalResult[];
}

export function RecentEvalsTable({ items }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Recent Evals
      </div>
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
            {items.map((e) => {
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
