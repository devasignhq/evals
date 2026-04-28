import { useQuery } from "@tanstack/react-query";
import { getRepoIndex } from "../api/repos";

export function useRepoIndex(repo: string | undefined) {
  return useQuery({
    queryKey: ["repo-index", repo],
    queryFn: () => getRepoIndex(repo!),
    enabled: !!repo,
  });
}
