import type { MissedRegression } from "../../../../shared/types";

interface Props {
  items: MissedRegression[];
}

export function MissedRegressions({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border-l-4 border-primary bg-primary-muted p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-primary">⚠</span>
        <h3 className="text-sm font-medium">Missed Regressions ({items.length})</h3>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        The agent's review did not address the following known hotspots:
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
            <th className="px-3 py-2 text-left">File</th>
            <th className="px-3 py-2 text-left">Pattern</th>
            <th className="px-3 py-2 text-left">Last Occurred</th>
            <th className="px-3 py-2 text-left">Reason</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={`${m.hotspot.filePath}-${i}`} className="border-b border-border/60">
              <td className="px-3 py-2 font-mono text-xs text-text-primary">
                {m.hotspot.filePath}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {m.hotspot.pattern}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {m.hotspot.lastOccurred}
              </td>
              <td className="px-3 py-2 text-sm text-text-secondary">{m.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
