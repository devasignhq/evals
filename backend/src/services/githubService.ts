import type { PRChangedFile, PRMetadata } from "../../../shared/types.js";

export interface GithubService {
  fetchPRMetadata(repo: string, prNumber: number): Promise<PRMetadata>;
}

interface RawPR {
  number: number;
  title: string;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  html_url: string;
}

interface RawPRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export class HttpGithubService implements GithubService {
  constructor(private readonly token: string) {}

  private headers() {
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${this.token}`,
    };
  }

  private async req<T>(
    path: string,
    context: { repo: string; prNumber: number }
  ): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(this.friendlyError(res.status, context));
    }
    return (await res.json()) as T;
  }

  private friendlyError(
    status: number,
    { repo, prNumber }: { repo: string; prNumber: number }
  ): string {
    if (status === 404) {
      return `Repo "${repo}" or PR #${prNumber} not found on GitHub. Check that the repo slug is correct, that PR #${prNumber} exists on it, and that GITHUB_TOKEN has access (private repos require a token with repo scope).`;
    }
    if (status === 401) {
      return "GitHub returned 401 Unauthorized. The GITHUB_TOKEN is missing or invalid — check the backend .env.";
    }
    if (status === 403) {
      return `GitHub returned 403 Forbidden for "${repo}". The token may lack access to this repo, or the API rate limit was hit.`;
    }
    return `GitHub API ${status} for ${repo}#${prNumber}.`;
  }

  async fetchPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> {
    const ctx = { repo, prNumber };
    const [pr, filesRaw] = await Promise.all([
      this.req<RawPR>(`/repos/${repo}/pulls/${prNumber}`, ctx),
      this.req<RawPRFile[]>(
        `/repos/${repo}/pulls/${prNumber}/files?per_page=100`,
        ctx
      ),
    ]);
    const changedFiles: PRChangedFile[] = filesRaw.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));
    const diff = filesRaw
      .filter((f) => f.patch)
      .map((f) => `--- ${f.filename}\n${f.patch}`)
      .join("\n\n");
    return {
      repo,
      prNumber: pr.number,
      title: pr.title,
      author: pr.user.login,
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      headSha: pr.head.sha,
      url: pr.html_url,
      changedFiles,
      diff,
    };
  }
}

export function createGithubService(): GithubService {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  return new HttpGithubService(token);
}
