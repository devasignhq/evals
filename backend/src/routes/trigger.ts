import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { repoSettings } from "../db/schema.js";
import { createDevasignService } from "../services/devasignService.js";
import { runEval } from "../services/evalService.js";
import { createGithubService } from "../services/githubService.js";

export const triggerRouter = new Hono();

const DEVASIGN_INSTALLATION_ID =
  process.env.DEVASIGN_INSTALLATION_ID ?? "109899673";

const triggerSchema = z.object({
  repo: z.string().min(3),
  prNumber: z.number().int().positive(),
  installationId: z.string().min(1).optional(),
  provider: z.enum(["claude", "gemini"]).optional(),
});

triggerRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", details: parsed.error.flatten() }, 400);
  }

  let installationId = parsed.data.installationId;
  if (!installationId) {
    const db = getDb();
    const rows = await db
      .select({ installationId: repoSettings.installationId })
      .from(repoSettings)
      .where(eq(repoSettings.repo, parsed.data.repo))
      .limit(1);
    installationId = rows[0]?.installationId ?? undefined;
  }
  if (!installationId) {
    installationId = DEVASIGN_INSTALLATION_ID;
  }

  try {
    const devasign = createDevasignService();
    const github = createGithubService();
    const result = await runEval(
      { devasign, github },
      {
        repo: parsed.data.repo,
        prNumber: parsed.data.prNumber,
        installationId,
        provider: parsed.data.provider,
      }
    );
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});
