import { useQuery } from "@tanstack/react-query";
import { getRepos, getHotspotCoverage } from "../api/repos";

export function useRepos() {
  return useQuery({
    queryKey: ["repos"],
    queryFn: getRepos,
  });
}

export function useHotspotCoverage(repo: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["hotspot-coverage", repo, days],
    queryFn: () => getHotspotCoverage(repo!, days),
    enabled: !!repo,
  });
}
