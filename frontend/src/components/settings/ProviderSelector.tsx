import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRepoSettings, getRepoSettings, updateRepoSettings } from "../../api/settings";
import { useRepos } from "../../hooks/useRepos";
import { AddRepositoryButton } from "./AddRepository";
import { Skeleton } from "../shared/Skeleton";

export function ProviderSelector() {
  const { data: repos, isLoading } = useRepos();

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Per-Repo Provider</div>
        <AddRepositoryButton />
      </div>
      <div className="mb-4 text-xs text-text-secondary">
        Choose which judge LLM evaluates each repo by default.
      </div>
      {!repos || repos.items.length === 0 ? (
        <div className="text-sm text-text-secondary">
          No repos yet. Click <span className="text-text-primary">+ Add Repository</span> to register one.
        </div>
      ) : (
        <div className="space-y-2">
          {repos.items.map((r) => (
            <RepoProviderRow key={r.repo} repo={r.repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoProviderRow({ repo }: { repo: string }) {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["repo-settings", repo],
    queryFn: () => getRepoSettings(repo),
  });
  const [pending, setPending] = useState<"claude" | "gemini" | "auto" | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const saved = settingsQ.data?.defaultProvider;
  const current = pending ?? saved;
  const dirty = pending !== undefined && pending !== saved;

  const mut = useMutation({
    mutationFn: (p: "claude" | "gemini" | "auto") =>
      updateRepoSettings(repo, { defaultProvider: p }),
    onSuccess: () => {
      setPending(undefined);
      qc.invalidateQueries({ queryKey: ["repo-settings", repo] });
    },
  });

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2">
      <div className="font-mono text-xs text-text-primary">{repo}</div>
      <div className="flex items-center gap-2">
        <select
          value={current ?? "claude"}
          onChange={(e) => setPending(e.target.value as typeof pending)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
        >
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="auto">Auto</option>
        </select>
        {(dirty || mut.isPending) && (
          <button
            onClick={() => current && mut.mutate(current)}
            disabled={!current || mut.isPending}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {mut.isPending ? "…" : "Save"}
          </button>
        )}
        <button
          onClick={() => setConfirmOpen(true)}
          aria-label={`Remove ${repo}`}
          title="Remove repo from evals"
          className="rounded-md border border-border bg-surface p-1 text-text-secondary hover:border-fail hover:text-fail"
        >
          <TrashIcon />
        </button>
      </div>
      {confirmOpen && (
        <RemoveRepoDialog repo={repo} onClose={() => setConfirmOpen(false)} />
      )}
    </div>
  );
}

function RemoveRepoDialog({ repo, onClose }: { repo: string; onClose: () => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deleteRepoSettings(repo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repos"] });
      qc.invalidateQueries({ queryKey: ["repo-settings", repo] });
      qc.invalidateQueries({ queryKey: ["evals"] });
      qc.invalidateQueries({ queryKey: ["aggregate"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-medium">Remove repo from evals</h2>
        <div className="mb-4 text-sm text-text-secondary">
          This will permanently delete{" "}
          <span className="font-mono text-text-primary">{repo}</span> along with all of its
          eval history and indexed context. This cannot be undone.
        </div>
        {mut.isError && (
          <div className="mb-3 rounded-md border border-[#7f1d1d] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-xs text-fail">
            {(mut.error as Error).message}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={mut.isPending}
            className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="rounded-md bg-fail px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {mut.isPending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
