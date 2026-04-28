import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepoSettings, updateRepoSettings } from "../../api/settings";
import { useRepos } from "../../hooks/useRepos";
import { Skeleton } from "../shared/Skeleton";

export function ProviderSelector() {
  const { data: repos, isLoading } = useRepos();

  if (isLoading) return <Skeleton className="h-40" />;
  if (!repos || repos.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-medium">Per-Repo Provider</div>
        <div className="mt-2 text-sm text-text-secondary">
          No repos seen yet. Trigger an eval to populate this list.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-1 text-sm font-medium">Per-Repo Provider</div>
      <div className="mb-4 text-xs text-text-secondary">
        Choose which judge LLM evaluates each repo by default.
      </div>
      <div className="space-y-2">
        {repos.items.map((r) => (
          <RepoProviderRow key={r.repo} repo={r.repo} />
        ))}
      </div>
    </div>
  );
}

function RepoProviderRow({ repo }: { repo: string }) {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["repo-settings", repo],
    queryFn: () => getRepoSettings(repo),
  });
  const [provider, setProvider] = useState<"claude" | "gemini" | "auto" | undefined>();
  const current = provider ?? settingsQ.data?.defaultProvider;

  const mut = useMutation({
    mutationFn: (p: "claude" | "gemini" | "auto") =>
      updateRepoSettings(repo, { defaultProvider: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repo-settings", repo] });
    },
  });

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2">
      <div className="font-mono text-xs text-text-primary">{repo}</div>
      <div className="flex items-center gap-2">
        <select
          value={current ?? "claude"}
          onChange={(e) => setProvider(e.target.value as typeof provider)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
        >
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="auto">Auto</option>
        </select>
        <button
          onClick={() => current && mut.mutate(current)}
          disabled={!current || mut.isPending}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {mut.isPending ? "…" : "Save"}
        </button>
      </div>
    </div>
  );
}
