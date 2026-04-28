import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { THRESHOLDS } from "../../../../shared/types";
import { getRepoSettings, updateRepoSettings } from "../../api/settings";
import { useRepos } from "../../hooks/useRepos";
import { Skeleton } from "../shared/Skeleton";

const DIMS = [
  { key: "relevance", label: "Relevance", max: 10, step: 0.5 },
  { key: "accuracy", label: "Accuracy", max: 10, step: 0.5 },
  { key: "depth", label: "Depth", max: 10, step: 0.5 },
  { key: "regressionCoverage", label: "Regression Coverage", max: 10, step: 0.5 },
] as const;

export function ThresholdEditor() {
  const { data: repos, isLoading } = useRepos();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-72" />;
  if (!repos || repos.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm font-medium">Pass/Fail Thresholds</div>
        <div className="mt-2 text-sm text-text-secondary">
          No repos to configure yet.
        </div>
      </div>
    );
  }

  const repo = selected ?? repos.items[0].repo;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-1 text-sm font-medium">Pass/Fail Thresholds</div>
      <div className="mb-4 text-xs text-text-secondary">
        Override the default thresholds for a specific repo.
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
          Repo
        </label>
        <select
          value={repo}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm"
        >
          {repos.items.map((r) => (
            <option key={r.repo} value={r.repo}>
              {r.repo}
            </option>
          ))}
        </select>
      </div>
      <ThresholdEditorForm repo={repo} />
    </div>
  );
}

function ThresholdEditorForm({ repo }: { repo: string }) {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["repo-settings", repo],
    queryFn: () => getRepoSettings(repo),
  });

  const [draft, setDraft] = useState<Record<string, number> | null>(null);

  const overrides = settingsQ.data?.thresholdOverrides ?? null;
  const merged: Record<string, number> = draft ?? {
    relevance: overrides?.relevance ?? THRESHOLDS.relevance,
    accuracy: overrides?.accuracy ?? THRESHOLDS.accuracy,
    depth: overrides?.depth ?? THRESHOLDS.depth,
    regressionCoverage:
      overrides?.regressionCoverage ?? THRESHOLDS.regressionCoverage,
    overall: overrides?.overall ?? THRESHOLDS.overall,
  };

  const mut = useMutation({
    mutationFn: (t: Record<string, number>) =>
      updateRepoSettings(repo, { thresholdOverrides: t }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repo-settings", repo] });
    },
  });

  return (
    <div className="space-y-4">
      {DIMS.map((d) => (
        <div key={d.key}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wider text-text-muted">{d.label}</span>
            <span className="font-mono text-text-primary">{merged[d.key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={d.max}
            step={d.step}
            value={merged[d.key]}
            onChange={(e) =>
              setDraft({ ...merged, [d.key]: Number(e.target.value) })
            }
            className="w-full accent-[#e85d04]"
          />
        </div>
      ))}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-text-muted">Overall</span>
          <span className="font-mono text-text-primary">{merged.overall}</span>
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={merged.overall}
          onChange={(e) =>
            setDraft({ ...merged, overall: Number(e.target.value) })
          }
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => setDraft(null)}
          className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          Reset to defaults
        </button>
        <button
          onClick={() => mut.mutate(merged)}
          disabled={mut.isPending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {mut.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
