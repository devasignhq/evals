import type { ProviderStatus } from "../../../shared/types";
import { api, USE_MOCK } from "./client";
import { mockProviders } from "./mock";

export async function getProviders(): Promise<{ providers: ProviderStatus[] }> {
  if (USE_MOCK) return mockProviders();
  return api<{ providers: ProviderStatus[] }>("/v1/providers");
}
