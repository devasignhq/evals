import type { EvalResult } from "../../../../shared/types";
import { PassFailBanner } from "../shared/PassFailBanner";
import { ProviderBadge } from "../shared/ProviderBadge";
import { ScoreGauge } from "../shared/ScoreGauge";
import { formatDateTime, formatSha } from "../../utils/format";

interface Props {
  evaluation: EvalResult;
}

export function PRHeader({ evaluation }: Props) {
  const githubUrl = `https://github.com/${evaluation.repo}/pull/${evaluation.prNumber}`;
  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span className="font-mono">{evaluation.repo}</span>
            <span className="text-text-muted">·</span>
            <span className="font-mono">{formatSha(evaluation.headSha)}</span>
            <span className="text-text-muted">·</span>
            <ProviderBadge provider={evaluation.provider} />
          </div>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            PR #{evaluation.prNumber}
          </h1>
          <div className="mt-1 text-sm text-text-secondary">
            Evaluated {formatDateTime(evaluation.evaluatedAt)} · agent review{" "}
            <span className="font-mono">{evaluation.agentReviewId}</span>
          </div>
          <div className="mt-4">
            <PassFailBanner passed={evaluation.passed} />
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-primary hover:text-primary-hover"
          >
            Open on GitHub →
          </a>
        </div>
        <ScoreGauge
          score={evaluation.scores.overall}
          dimension="overall"
          size="lg"
        />
      </div>
    </div>
  );
}
