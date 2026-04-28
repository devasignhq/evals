import { GoogleGenerativeAI } from "@google/generative-ai";
import type { JudgeProvider } from "./types.js";

export const GEMINI_MODEL = "gemini-1.5-pro";

export class GeminiProvider implements JudgeProvider {
  readonly name = "gemini" as const;
  readonly model = GEMINI_MODEL;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async judge(prompt: string, systemPrompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
