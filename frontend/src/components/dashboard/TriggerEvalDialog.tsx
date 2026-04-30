import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { triggerEval } from "../../api/evals";
import { useProviders } from "../../hooks/useProviders";
import { useRepos } from "../../hooks/useRepos";

export function TriggerEvalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        + Trigger Eval
      </button>
      {open && <TriggerEvalDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function TriggerEvalDialog({ onClose }: { onClose: () => void }) {
  const { data: repos, isLoading: reposLoading } = useRepos();
  const { data: providers } = useProviders();
  const [repo, setRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [provider, setProvider] = useState<"claude" | "gemini" | "default">("default");
  const qc = useQueryClient();
  const nav = useNavigate();

  const mut = useMutation({
    mutationFn: () =>
      triggerEval({
        repo,
        prNumber: parseInt(prNumber, 10),
        provider: provider === "default" ? undefined : provider,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["evals"] });
      qc.invalidateQueries({ queryKey: ["aggregate"] });
      qc.invalidateQueries({ queryKey: ["trends"] });
      const [org, name] = data.repo.split("/");
      onClose();
      nav(`/eval/${org}/${name}/${data.prNumber}`);
    },
  });

  const repoOptions = repos?.items ?? [];
  const noRepos = !reposLoading && repoOptions.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-medium">Trigger Manual Eval</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
              Repo
            </label>
            {noRepos ? (
              <div className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-secondary">
                No repos registered.{" "}
                <Link
                  to="/settings"
                  onClick={onClose}
                  className="text-primary hover:text-primary-hover"
                >
                  Add one in Settings
                </Link>
                .
              </div>
            ) : (
              <select
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={reposLoading}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm"
              >
                <option value="" disabled>
                  {reposLoading ? "Loading…" : "Select a repo"}
                </option>
                {repoOptions.map((r) => (
                  <option key={r.repo} value={r.repo}>
                    {r.repo}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
              PR Number
            </label>
            <input
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="42"
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm"
            >
              <option value="default">Use repo default</option>
              {providers?.providers
                .filter((p) => p.connected)
                .map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.provider === "claude" ? "Claude" : "Gemini"}
                  </option>
                ))}
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
            disabled={!repo || !prNumber || mut.isPending}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {mut.isPending ? "Running…" : "Run Eval"}
          </button>
        </div>
      </div>
    </div>
  );
}
