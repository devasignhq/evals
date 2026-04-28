import { ClaudeProvider, CLAUDE_MODEL } from "./claude.js";
import { GeminiProvider, GEMINI_MODEL } from "./gemini.js";
import type { JudgeProvider, ProviderName } from "./types.js";

export interface ProviderConfig {
  provider: ProviderName;
  anthropicApiKey?: string;
  geminiApiKey?: string;
}

export function createJudgeProvider(config: ProviderConfig): JudgeProvider {
  if (config.provider === "claude") {
    if (!config.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY required for Claude provider");
    }
    return new ClaudeProvider(config.anthropicApiKey);
  }
  if (config.provider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY required for Gemini provider");
    }
    return new GeminiProvider(config.geminiApiKey);
  }
  throw new Error(`Unknown provider: ${config.provider as string}`);
}

export function defaultProvider(): ProviderName {
  const v = (process.env.JUDGE_PROVIDER ?? "claude").toLowerCase();
  return v === "gemini" ? "gemini" : "claude";
}

export function availableProviders(): ProviderName[] {
  const out: ProviderName[] = [];
  if (process.env.ANTHROPIC_API_KEY) out.push("claude");
  if (process.env.GEMINI_API_KEY) out.push("gemini");
  return out;
}

export function modelFor(name: ProviderName): string {
  return name === "claude" ? CLAUDE_MODEL : GEMINI_MODEL;
}

export function providerFromEnv(name: ProviderName): JudgeProvider {
  return createJudgeProvider({
    provider: name,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  });
}
