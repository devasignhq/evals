export type ProviderName = "claude" | "gemini";

export interface JudgeProvider {
  name: ProviderName;
  model: string;
  judge(prompt: string, systemPrompt: string): Promise<string>;
}
