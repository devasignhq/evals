import { useQuery } from "@tanstack/react-query";
import { listEvals, type EvalListFilters } from "../api/evals";

export function useEvals(filters: EvalListFilters) {
  return useQuery({
    queryKey: ["evals", filters],
    queryFn: () => listEvals(filters),
  });
}
