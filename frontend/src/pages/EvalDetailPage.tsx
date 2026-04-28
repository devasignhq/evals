import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChangedFiles } from "../components/eval-detail/ChangedFiles";
import { MissedRegressions } from "../components/eval-detail/MissedRegressions";
import { PRHeader } from "../components/eval-detail/PRHeader";
import { ScoreBreakdown } from "../components/eval-detail/ScoreBreakdown";
import { ErrorState } from "../components/shared/ErrorState";
import { Skeleton } from "../components/shared/Skeleton";
import { useEvalDetail } from "../hooks/useEvalDetail";
import { useRepoIndex } from "../hooks/useRepoIndex";

export function EvalDetailPage() {
  const { org, name, prNumber } = useParams<{ org: string; name: string; prNumber: string }>();
  const repo = org && name ? `${org}/${name}` : undefined;
  const prNum = prNumber ? parseInt(prNumber, 10) : undefined;

  const evalQ = useEvalDetail(repo, prNum);
  const idxQ = useRepoIndex(repo);
  const [showRaw, setShowRaw] = useState(false);

  if (evalQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (evalQ.isError) {
    return (
      <ErrorState
        message={(evalQ.error as Error).message}
        onRetry={() => evalQ.refetch()}
      />
    );
  }
  if (!evalQ.data) return null;
  const e = evalQ.data;

  // Reconstruct file list from missedRegressions hotspots + index hotspots only
  // (we don't carry full PR file list in EvalResult)
  const inferredFiles = idxQ.data
    ? idxQ.data.regressionHotspots.map((h) => ({ filename: h.filePath }))
    : [];

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="text-xs text-text-muted hover:text-text-secondary"
      >
        ← Back to dashboard
      </Link>
      <PRHeader evaluation={e} />
      <ScoreBreakdown scores={e.scores} />
      {e.regressionDetected && <MissedRegressions items={e.missedRegressions} />}
      {idxQ.data && inferredFiles.length > 0 && (
        <ChangedFiles
          files={inferredFiles}
          hotspots={idxQ.data.regressionHotspots}
        />
      )}
      <div className="rounded-lg border border-border bg-surface">
        <button
          onClick={() => setShowRaw((s) => !s)}
          className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-sm font-medium hover:bg-elevated"
        >
          <span>Raw Judge Output</span>
          <span className="font-mono text-xs text-text-muted">
            {showRaw ? "▼" : "▶"}
          </span>
        </button>
        {showRaw && (
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-text-secondary">
            {e.rawJudgeResponse}
          </pre>
        )}
      </div>
    </div>
  );
}
