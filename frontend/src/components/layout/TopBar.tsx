import { useProviders } from "../../hooks/useProviders";
import { useAppFilters } from "../../state/filters";
import { useRepos } from "../../hooks/useRepos";

export function TopBar() {
  const { repo, range, provider, setRepo, setRange, setProvider } = useAppFilters();
  const { data: repos } = useRepos();
  const { data: providers } = useProviders();

  const claudeOk = providers?.providers.find((p) => p.provider === "claude")?.connected;
  const geminiOk = providers?.providers.find((p) => p.provider === "gemini")?.connected;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2">
        <select
          value={repo ?? ""}
          onChange={(e) => setRepo(e.target.value || null)}
          className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm font-mono text-text-primary"
        >
          <option value="">All repos</option>
          {repos?.items.map((r) => (
            <option key={r.repo} value={r.repo}>
              {r.repo}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center rounded-md border border-border bg-elevated p-0.5 text-xs">
        {(["7d", "30d", "90d", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-sm px-3 py-1 transition-colors ${
              range === r
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {r === "all" ? "All" : r}
          </button>
        ))}
      </div>
      <div className="flex items-center rounded-md border border-border bg-elevated p-0.5 text-xs">
        {(["all", "claude", "gemini"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`rounded-sm px-3 py-1 capitalize transition-colors ${
              provider === p
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${claudeOk ? "bg-pass" : "bg-fail"}`}
          />
          Claude
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${geminiOk ? "bg-pass" : "bg-fail"}`}
          />
          Gemini
        </span>
      </div>
    </header>
  );
}
