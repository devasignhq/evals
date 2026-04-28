import { useMemo } from "react";
import { KPICard } from "../components/dashboard/KPICard";
import { RecentEvalsTable } from "../components/dashboard/RecentEvalsTable";
import { RegressionHeatmap } from "../components/dashboard/RegressionHeatmap";
import { ScoreTrendsChart } from "../components/dashboard/ScoreTrendsChart";
import { TriggerEvalButton } from "../components/dashboard/TriggerEvalDialog";
import { EmptyState } from "../components/shared/EmptyState";
import { ErrorState } from "../components/shared/ErrorState";
import { Skeleton } from "../components/shared/Skeleton";
import { useAggregateStats } from "../hooks/useAggregateStats";
import { useEvals } from "../hooks/useEvals";
import { useRepoIndex } from "../hooks/useRepoIndex";
import { useScoreTrends } from "../hooks/useScoreTrends";
import { rangeToDates, useAppFilters } from "../state/filters";

export function DashboardPage() {
  const { repo, range, provider } = useAppFilters();
  const { from, to } = useMemo(() => rangeToDates(range), [range]);

  const aggQ = useAggregateStats({ repo: repo ?? undefined, from, to });
  const trendsQ = useScoreTrends({ repo: repo ?? undefined, from, to });
  const evalsQ = useEvals({
    repo: repo ?? undefined,
    provider: provider === "all" ? undefined : provider,
    from,
    to,
    limit: 10,
  });
  // Use first repo's index for hotspot heatmap when none selected
  const heatmapRepo = repo ?? evalsQ.data?.items[0]?.repo;
  const idxQ = useRepoIndex(heatmapRepo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
          <div className="text-sm text-text-secondary">
            Quality monitor for the DevAsign code review agent.
          </div>
        </div>
        <TriggerEvalButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {aggQ.isLoading && (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        )}
        {aggQ.isError && (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState
              message={(aggQ.error as Error).message}
              onRetry={() => aggQ.refetch()}
            />
          </div>
        )}
        {aggQ.data && (
          <>
            {(() => {
              const prev = aggQ.data.previous;
              const delta = (cur: number, p: number | undefined) =>
                p === undefined ? undefined : { value: cur - p, label: "vs prior" };
              return (
                <>
                  <KPICard
                    label="Overall Avg"
                    value={aggQ.data.overallAvg}
                    spark={trendsQ.data?.points.map((p) => p.overall) ?? []}
                    sparkColor="#e85d04"
                    delta={delta(aggQ.data.overallAvg, prev?.overallAvg)}
                  />
                  <KPICard
                    label="Pass Rate"
                    value={`${aggQ.data.passRate}%`}
                    spark={trendsQ.data?.points.map((p) => p.overall) ?? []}
                    sparkColor="#22c55e"
                    delta={delta(aggQ.data.passRate, prev?.passRate)}
                  />
                  <KPICard
                    label="Missed Regressions"
                    value={aggQ.data.missedRegressions}
                    spark={trendsQ.data?.points.map((p) => p.regressionCoverage) ?? []}
                    sparkColor="#ef4444"
                    direction="lower-better"
                    delta={delta(aggQ.data.missedRegressions, prev?.missedRegressions)}
                  />
                  <KPICard
                    label="Total Evals"
                    value={aggQ.data.totalEvals}
                    spark={trendsQ.data?.points.map((p) => p.relevance) ?? []}
                    sparkColor="#60a5fa"
                    direction="neutral"
                    delta={delta(aggQ.data.totalEvals, prev?.totalEvals)}
                  />
                </>
              );
            })()}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          {trendsQ.isLoading && <Skeleton className="h-72" />}
          {trendsQ.isError && (
            <ErrorState
              message={(trendsQ.error as Error).message}
              onRetry={() => trendsQ.refetch()}
            />
          )}
          {trendsQ.data &&
            (trendsQ.data.points.length === 0 ? (
              <EmptyState
                title="No trend data yet"
                message="Trigger your first eval to start seeing scores over time."
              />
            ) : (
              <ScoreTrendsChart points={trendsQ.data.points} />
            ))}
        </div>
        <div>
          {idxQ.isLoading && <Skeleton className="h-72" />}
          {idxQ.data && evalsQ.data && (
            <RegressionHeatmap
              hotspots={idxQ.data.regressionHotspots}
              evals={evalsQ.data.items}
            />
          )}
        </div>
      </div>

      <div>
        {evalsQ.isLoading && <Skeleton className="h-64" />}
        {evalsQ.isError && (
          <ErrorState
            message={(evalsQ.error as Error).message}
            onRetry={() => evalsQ.refetch()}
          />
        )}
        {evalsQ.data &&
          (evalsQ.data.items.length === 0 ? (
            <EmptyState
              title="No evals match these filters"
              message="Try expanding the date range or clearing the repo filter."
            />
          ) : (
            <RecentEvalsTable items={evalsQ.data.items} />
          ))}
      </div>
    </div>
  );
}
