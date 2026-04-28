import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { EvalDetailPage } from "./pages/EvalDetailPage";
import { RepoIndexPage } from "./pages/RepoIndexPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/eval/:org/:name/:prNumber" element={<EvalDetailPage />} />
        <Route path="/repos/:org/:name/index" element={<RepoIndexPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
