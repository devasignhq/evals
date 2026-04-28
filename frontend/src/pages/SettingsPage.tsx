import { Link } from "react-router-dom";
import { ApiKeyStatus } from "../components/settings/ApiKeyStatus";
import { ProviderSelector } from "../components/settings/ProviderSelector";
import { ThresholdEditor } from "../components/settings/ThresholdEditor";
import { useRepos } from "../hooks/useRepos";

export function SettingsPage() {
  const { data: repos } = useRepos();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <div className="text-sm text-text-secondary">
          Configure providers, thresholds, and API connectivity.
        </div>
      </div>
      <ApiKeyStatus />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProviderSelector />
        <ThresholdEditor />
      </div>
      {repos && repos.items.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-2 text-sm font-medium">Repo Indexes</div>
          <div className="mb-3 text-xs text-text-secondary">
            View the indexed knowledge that the DevAsign agent maintains for each repo.
          </div>
          <ul className="space-y-1">
            {repos.items.map((r) => {
              const [org, name] = r.repo.split("/");
              return (
                <li key={r.repo}>
                  <Link
                    to={`/repos/${org}/${name}/index`}
                    className="font-mono text-sm text-primary hover:text-primary-hover"
                  >
                    {r.repo} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
