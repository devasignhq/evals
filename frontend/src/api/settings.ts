import { api, USE_MOCK } from "./client";

export interface RepoSettingsResponse {
  repo: string;
  installationId: string | null;
  defaultProvider: "claude" | "gemini" | "auto";
  evalEnabled: boolean;
  thresholdOverrides: Record<string, number> | null;
}

const MOCK_SETTINGS: Record<string, RepoSettingsResponse> = {};

export async function getRepoSettings(repo: string): Promise<RepoSettingsResponse> {
  if (USE_MOCK) {
    return (
      MOCK_SETTINGS[repo] ?? {
        repo,
        installationId: null,
        defaultProvider: "claude",
        evalEnabled: true,
        thresholdOverrides: null,
      }
    );
  }
  return api(`/v1/settings/repo/${repo}`);
}

export async function updateRepoSettings(
  repo: string,
  updates: Partial<Omit<RepoSettingsResponse, "repo">>
): Promise<{ ok: true }> {
  if (USE_MOCK) {
    MOCK_SETTINGS[repo] = {
      ...(MOCK_SETTINGS[repo] ?? {
        repo,
        installationId: null,
        defaultProvider: "claude",
        evalEnabled: true,
        thresholdOverrides: null,
      }),
      ...updates,
    } as RepoSettingsResponse;
    return { ok: true };
  }
  return api(`/v1/settings/repo/${repo}`, { method: "PUT", json: updates });
}

export async function deleteRepoSettings(repo: string): Promise<{ ok: true }> {
  if (USE_MOCK) {
    delete MOCK_SETTINGS[repo];
    return { ok: true };
  }
  return api(`/v1/settings/repo/${repo}`, { method: "DELETE" });
}
