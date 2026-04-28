import { useProviders } from "../../hooks/useProviders";
import { Skeleton } from "../shared/Skeleton";

export function ApiKeyStatus() {
  const { data, isLoading, refetch, isFetching } = useProviders();

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 text-sm font-medium">API Key Status</div>
      <div className="mb-3 text-xs text-text-secondary">
        Keys are read from the backend <span className="font-mono">.env</span> only —
        update there to change them.
      </div>
      <div className="space-y-2">
        {data.providers.map((p) => (
          <div
            key={p.provider}
            className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="capitalize">{p.provider}</span>
              <span className="font-mono text-xs text-text-muted">{p.model}</span>
            </div>
            <div className="flex items-center gap-3">
              {p.connected ? (
                <span className="font-mono text-xs text-pass">✓ Connected</span>
              ) : (
                <span className="font-mono text-xs text-fail">✗ Missing</span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs hover:border-primary disabled:opacity-40"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
