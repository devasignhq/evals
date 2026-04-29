import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "▦" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="DevAsign" className="h-6 w-auto" />
          <span className="text-sm font-medium text-primary">Eval</span>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-text-secondary hover:text-text-primary lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-l-2 border-primary bg-elevated pl-2 text-text-primary"
                  : "text-text-secondary hover:bg-elevated hover:text-text-primary"
              }`
            }
          >
            <span className="font-mono text-xs text-text-muted">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 font-mono text-xs text-text-muted">
        v0.1.0
      </div>
    </aside>
  );
}
