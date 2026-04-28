import type { IndexedRepoContext } from "../../../shared/types";
import { api, USE_MOCK } from "./client";
import { mockHotspotCoverage, mockRepoIndex, mockRepos } from "./mock";

export interface RepoListItem {
  repo: string;
  lastEvaluatedAt: string | null;
  totalEvals: number;
  avgOverall: number;
}

export async function getRepos(): Promise<{ items: RepoListItem[] }> {
  if (USE_MOCK) return mockRepos();
  return api<{ items: RepoListItem[] }>("/v1/repos");
}

export async function getRepoIndex(repo: string): Promise<IndexedRepoContext> {
  if (USE_MOCK) return mockRepoIndex(repo);
  return api<IndexedRepoContext>(`/v1/repos/${repo}/index`);
}

export async function getHotspotCoverage(
  repo: string,
  days = 30
): Promise<{ coverage: number; hotspotsTouched: number; hotspotsTotal: number }> {
  if (USE_MOCK) return mockHotspotCoverage(repo, days);
  return api(`/v1/repos/${repo}/hotspot-coverage?days=${days}`);
}
