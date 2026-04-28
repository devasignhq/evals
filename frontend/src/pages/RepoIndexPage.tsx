import { useParams, Link } from "react-router-dom";
import { CoverageGauge } from "../components/repo-index/CoverageGauge";
import { HistoricalIssues } from "../components/repo-index/HistoricalIssues";
import { HotspotsTable } from "../components/repo-index/HotspotsTable";
import { IndexSummary } from "../components/repo-index/IndexSummary";
import { ErrorState } from "../components/shared/ErrorState";
import { Skeleton } from "../components/shared/Skeleton";
import { useHotspotCoverage } from "../hooks/useRepos";
import { useRepoIndex } from "../hooks/useRepoIndex";

export function RepoIndexPage() {
  const { org, name } = useParams<{ org: string; name: string }>();
  const repo = org && name ? `${org}/${name}` : undefined;

  const idxQ = useRepoIndex(repo);
  const covQ = useHotspotCoverage(repo);

  if (idxQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (idxQ.isError) {
    return (
      <ErrorState
        message={(idxQ.error as Error).message}
        onRetry={() => idxQ.refetch()}
      />
    );
  }
  if (!idxQ.data) return null;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-xs text-text-muted hover:text-text-secondary">
        ← Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Repo Index <span className="font-mono text-text-secondary">{repo}</span>
        </h1>
        <div className="text-sm text-text-secondary">
          Indexed knowledge fetched from the DevAsign agent.
        </div>
      </div>
      <IndexSummary data={idxQ.data} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HotspotsTable hotspots={idxQ.data.regressionHotspots} />
        </div>
        <div>
          {covQ.data && (
            <CoverageGauge
              coverage={covQ.data.coverage}
              touched={covQ.data.hotspotsTouched}
              total={covQ.data.hotspotsTotal}
            />
          )}
        </div>
      </div>
      <HistoricalIssues items={idxQ.data.historicalIssues} />
    </div>
  );
}
