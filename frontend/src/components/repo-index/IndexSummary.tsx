import type { IndexedRepoContext } from "../../../../shared/types";
import { relative } from "../../utils/format";

interface Props {
  data: IndexedRepoContext;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-2 font-mono text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}

export function IndexSummary({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Index Age" value={`${data.ageInDays}d`} />
      <StatCard label="Last Indexed" value={relative(data.indexedAt)} />
      <StatCard label="Hotspots" value={data.regressionHotspots.length} />
      <StatCard label="Historical Issues" value={data.historicalIssues.length} />
    </div>
  );
}
