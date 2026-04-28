import { useMemo, useState } from "react";
import type { RegressionHotspot } from "../../../../shared/types";

interface Props {
  hotspots: RegressionHotspot[];
}

export function HotspotsTable({ hotspots }: Props) {
  const [sort, setSort] = useState<"file" | "date">("date");
  const sorted = useMemo(() => {
    const copy = [...hotspots];
    if (sort === "file") {
      copy.sort((a, b) => a.filePath.localeCompare(b.filePath));
    } else {
      copy.sort((a, b) => b.lastOccurred.localeCompare(a.lastOccurred));
    }
    return copy;
  }, [hotspots, sort]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium">Regression Hotspots</span>
        <div className="flex items-center rounded-md border border-border bg-elevated p-0.5 text-xs">
          <button
            onClick={() => setSort("date")}
            className={`rounded-sm px-2 py-0.5 ${sort === "date" ? "bg-primary text-white" : "text-text-secondary"}`}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSort("file")}
            className={`rounded-sm px-2 py-0.5 ${sort === "file" ? "bg-primary text-white" : "text-text-secondary"}`}
          >
            File
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-text-muted">
            <th className="px-4 py-2 text-left">File</th>
            <th className="px-4 py-2 text-left">Pattern</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Last Occurred</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr
              key={h.filePath}
              className="border-l-4 border-primary border-b border-b-border/60 bg-primary-muted last:border-b-0"
            >
              <td className="px-4 py-2 font-mono text-xs text-text-primary">
                {h.filePath}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                {h.pattern}
              </td>
              <td className="px-4 py-2 text-sm text-text-secondary">{h.description}</td>
              <td className="px-4 py-2 font-mono text-xs text-text-secondary">
                {h.lastOccurred}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
