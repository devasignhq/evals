import Anthropic from "@anthropic-ai/sdk";
import type { JudgeProvider } from "./types.js";

export const CLAUDE_MODEL = "claude-opus-4-5";

export class ClaudeProvider implements JudgeProvider {
  readonly name = "claude" as const;
  readonly model = CLAUDE_MODEL;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async judge(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  }
}
