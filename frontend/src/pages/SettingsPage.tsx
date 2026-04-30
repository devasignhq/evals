import { ApiKeyStatus } from "../components/settings/ApiKeyStatus";
import { ProviderSelector } from "../components/settings/ProviderSelector";
import { RepoIndexList } from "../components/settings/RepoIndexList";
import { ThresholdEditor } from "../components/settings/ThresholdEditor";

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <div className="text-sm text-text-secondary">
          Configure providers, thresholds, and API connectivity.
        </div>
      </div>
      <ApiKeyStatus />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderSelector />
        <ThresholdEditor />
      </div>
      <RepoIndexList />
    </div>
  );
}
