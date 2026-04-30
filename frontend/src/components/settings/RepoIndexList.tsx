import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { RepoListItem } from "../../api/repos";
import { reindexRepo } from "../../api/repos";
import { useRepos } from "../../hooks/useRepos";
import { formatDate } from "../../utils/format";

export function RepoIndexList() {
  const { data: repos } = useRepos();
  if (!repos || repos.items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-1 text-sm font-medium">Repo Indexes</div>
      <div className="mb-3 text-xs text-text-secondary">
        Index a repo's commit history to build regression hotspots that the judge
        uses when scoring reviews.
      </div>
      <div className="space-y-2">
        {repos.items.map((r) => (
          <RepoIndexRow key={r.repo} item={r} />
        ))}
      </div>
    </div>
  );
}

function RepoIndexRow({ item }: { item: RepoListItem }) {
  const qc = useQueryClient();
  const [org, name] = item.repo.split("/");

  const mut = useMutation({
    mutationFn: () => reindexRepo(item.repo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repos"] });
      qc.invalidateQueries({ queryKey: ["repo-index", item.repo] });
    },
  });

  const indexed = item.lastIndexedAt
    ? `Indexed ${formatDate(item.lastIndexedAt)} · ${item.hotspotCount} hotspot${item.hotspotCount === 1 ? "" : "s"}`
    : "Never indexed";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2">
      <div className="min-w-0 flex-1">
        <Link
          to={`/repos/${org}/${name}/index`}
          className="block truncate font-mono text-xs text-primary hover:text-primary-hover"
        >
          {item.repo} →
        </Link>
        <div className="mt-0.5 text-xs text-text-muted">{indexed}</div>
        {mut.isError && (
          <div className="mt-1 text-xs text-fail">
            {(mut.error as Error).message}
          </div>
        )}
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="shrink-0 rounded-md border border-border bg-surface px-3 py-1 text-xs hover:border-primary disabled:opacity-40"
      >
        {mut.isPending ? "Indexing…" : "Re-index"}
      </button>
    </div>
  );
}
