import type { RegressionHotspot } from "../../../../shared/types";

interface Props {
  files: { filename: string; status?: string; additions?: number; deletions?: number }[];
  hotspots: RegressionHotspot[];
}

export function ChangedFiles({ files, hotspots }: Props) {
  const hotspotPaths = new Set(hotspots.map((h) => h.filePath));
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Changed Files ({files.length})
      </div>
      <ul>
        {files.map((f) => {
          const hot = hotspotPaths.has(f.filename);
          return (
            <li
              key={f.filename}
              className={`flex items-center justify-between border-b border-border/60 px-4 py-2 last:border-b-0 ${
                hot ? "border-l-4 border-l-primary bg-primary-muted" : ""
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-text-primary">{f.filename}</span>
                {hot && (
                  <span className="rounded-md bg-primary-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                    ⚠ Hotspot
                  </span>
                )}
              </div>
              {(f.additions !== undefined || f.deletions !== undefined) && (
                <div className="font-mono text-[11px] text-text-muted">
                  <span className="text-pass">+{f.additions ?? 0}</span>{" "}
                  <span className="text-fail">−{f.deletions ?? 0}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
