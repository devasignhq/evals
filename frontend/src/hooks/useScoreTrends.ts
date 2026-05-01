import { useQuery } from "@tanstack/react-query";
import { getTrends } from "../api/evals";

export function useScoreTrends(filters: {
  repo?: string;
  provider?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["trends", filters],
    queryFn: () => getTrends(filters),
  });
}
