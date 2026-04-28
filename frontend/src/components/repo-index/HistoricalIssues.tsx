import type { HistoricalIssue } from "../../../../shared/types";

const ICON: Record<HistoricalIssue["issueType"], string> = {
  bug: "🐛",
  security: "🔒",
  performance: "⚡",
  architecture: "🏗",
};

const RISK: Record<HistoricalIssue["recurrenceRisk"], string> = {
  high: "text-fail",
  medium: "text-warn",
  low: "text-pass",
};

interface Props {
  items: HistoricalIssue[];
}

export function HistoricalIssues({ items }: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Historical Issues
      </div>
      <ol className="relative ml-6 mr-4 my-4 border-l border-border">
        {items.map((issue, i) => (
          <li key={i} className="relative mb-6 pl-6 last:mb-2">
            <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-elevated text-xs">
              {ICON[issue.issueType]}
            </span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-text-primary">{issue.description}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span className="rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono uppercase tracking-wider">
                    {issue.issueType}
                  </span>
                  <span className={`font-mono uppercase tracking-wider ${RISK[issue.recurrenceRisk]}`}>
                    {issue.recurrenceRisk} risk
                  </span>
                  {issue.resolvedIn && (
                    <span className="font-mono text-text-muted">
                      resolved in {issue.resolvedIn}
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-text-muted">
                  {issue.affectedFiles.join(", ")}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
