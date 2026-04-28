import { useEffect, useState } from "react";

export type DateRange = "7d" | "30d" | "90d" | "all";
export type ProviderFilter = "all" | "claude" | "gemini";

interface Filters {
  repo: string | null;
  range: DateRange;
  provider: ProviderFilter;
}

const STORAGE_KEY = "devasign-eval-filters";

const DEFAULT: Filters = {
  repo: null,
  range: "30d",
  provider: "all",
};

const listeners = new Set<() => void>();

let state: Filters = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT;
})();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function emit() {
  for (const l of listeners) l();
}

export function useAppFilters() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    ...state,
    setRepo(repo: string | null) {
      state = { ...state, repo };
      persist();
      emit();
    },
    setRange(range: DateRange) {
      state = { ...state, range };
      persist();
      emit();
    },
    setProvider(provider: ProviderFilter) {
      state = { ...state, provider };
      persist();
      emit();
    },
  };
}

export function rangeToDates(range: DateRange): { from?: string; to?: string } {
  if (range === "all") return {};
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
