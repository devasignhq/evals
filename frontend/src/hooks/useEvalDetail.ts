import { useQuery } from "@tanstack/react-query";
import { getEvalDetail } from "../api/evals";

export function useEvalDetail(repo: string | undefined, prNumber: number | undefined) {
  return useQuery({
    queryKey: ["eval-detail", repo, prNumber],
    queryFn: () => getEvalDetail(repo!, prNumber!),
    enabled: !!repo && !!prNumber,
  });
}
