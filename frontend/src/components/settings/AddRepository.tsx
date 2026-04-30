import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRepoSettings } from "../../api/settings";

const SLUG_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const SHARED_INSTALLATION_ID = "109899673";

export function AddRepositoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
      >
        + Add Repository
      </button>
      {open && <AddRepositoryDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddRepositoryDialog({ onClose }: { onClose: () => void }) {
  const [repo, setRepo] = useState("");
  const [defaultProvider, setDefaultProvider] = useState<"claude" | "gemini" | "auto">("claude");
  const qc = useQueryClient();

  const slugValid = SLUG_RE.test(repo.trim());

  const mut = useMutation({
    mutationFn: () =>
      updateRepoSettings(repo.trim(), {
        installationId: SHARED_INSTALLATION_ID,
        defaultProvider,
        evalEnabled: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repos"] });
      qc.invalidateQueries({ queryKey: ["repo-settings", repo.trim()] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-medium">Add Repository</h2>
        <div className="mb-4 text-xs text-text-secondary">
          Register a DevAsign project repo so you can run evals on its PRs.
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
              Repo (org/name)
            </label>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="devasignhq/devasign-api"
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm"
              autoFocus
            />
            {repo && !slugValid && (
              <div className="mt-1 text-xs text-text-muted">
                Slug must look like <span className="font-mono">org/name</span>.
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
              Default Provider
            </label>
            <select
              value={defaultProvider}
              onChange={(e) =>
                setDefaultProvider(e.target.value as "claude" | "gemini" | "auto")
              }
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm"
            >
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          {mut.isError && (
            <div className="rounded-md border border-[#7f1d1d] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-xs text-fail">
              {(mut.error as Error).message}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={mut.isPending}
            className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!slugValid || mut.isPending}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {mut.isPending ? "Saving…" : "Add Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
