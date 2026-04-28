import { Hono } from "hono";
import type { ProviderStatus } from "../../../shared/types.js";
import { CLAUDE_MODEL } from "../services/providers/claude.js";
import { GEMINI_MODEL } from "../services/providers/gemini.js";

export const providersRouter = new Hono();

providersRouter.get("/", (c) => {
  const statuses: ProviderStatus[] = [
    {
      provider: "claude",
      connected: !!process.env.ANTHROPIC_API_KEY,
      model: CLAUDE_MODEL,
    },
    {
      provider: "gemini",
      connected: !!process.env.GEMINI_API_KEY,
      model: GEMINI_MODEL,
    },
  ];
  return c.json({ providers: statuses });
});
