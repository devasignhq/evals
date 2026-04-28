import { Hono } from "hono";
import { z } from "zod";
import { createDevasignService } from "../services/devasignService.js";
import { runEval } from "../services/evalService.js";
import { createGithubService } from "../services/githubService.js";

export const triggerRouter = new Hono();

const triggerSchema = z.object({
  repo: z.string().min(3),
  prNumber: z.number().int().positive(),
  provider: z.enum(["claude", "gemini"]).optional(),
});

triggerRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", details: parsed.error.flatten() }, 400);
  }
  try {
    const devasign = createDevasignService();
    const github = createGithubService();
    const result = await runEval(
      { devasign, github },
      {
        repo: parsed.data.repo,
        prNumber: parsed.data.prNumber,
        provider: parsed.data.provider,
      }
    );
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});
