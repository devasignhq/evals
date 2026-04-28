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

  private async req<T>(path: string): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${res.status} ${path}: ${body}`);
    }
    return (await res.json()) as T;
  }

  async fetchPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> {
    // TODO: Implement pagination to handle PRs with >100 changed files
    const [pr, filesRaw] = await Promise.all([
      this.req<RawPR>(`/repos/${repo}/pulls/${prNumber}`),
      this.req<RawPRFile[]>(`/repos/${repo}/pulls/${prNumber}/files?per_page=100`),
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
