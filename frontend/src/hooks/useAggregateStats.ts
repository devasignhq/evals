import { useQuery } from "@tanstack/react-query";
import { getAggregate } from "../api/evals";

export function useAggregateStats(filters: {
  repo?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["aggregate", filters],
    queryFn: () => getAggregate(filters),
  });
}
