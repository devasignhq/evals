import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { repoSettings } from "../db/schema.js";

export const settingsRouter = new Hono();

const updateSchema = z.object({
  defaultProvider: z.enum(["claude", "gemini", "auto"]).optional(),
  evalEnabled: z.boolean().optional(),
  thresholdOverrides: z.record(z.string(), z.number()).optional(),
});

settingsRouter.get("/repo/:org/:name", async (c) => {
  const repo = `${c.req.param("org")}/${c.req.param("name")}`;
  const db = getDb();
  const rows = await db
    .select()
    .from(repoSettings)
    .where(eq(repoSettings.repo, repo))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return c.json({
      repo,
      defaultProvider: "claude",
      evalEnabled: true,
      thresholdOverrides: null,
    });
  }
  return c.json({
    repo: row.repo,
    defaultProvider: row.defaultProvider,
    evalEnabled: row.evalEnabled,
    thresholdOverrides: row.thresholdOverrides,
  });
});

settingsRouter.put("/repo/:org/:name", async (c) => {
  const repo = `${c.req.param("org")}/${c.req.param("name")}`;
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", details: parsed.error.flatten() }, 400);
  }
  const db = getDb();
  await db
    .insert(repoSettings)
    .values({
      repo,
      defaultProvider: parsed.data.defaultProvider ?? "claude",
      evalEnabled: parsed.data.evalEnabled ?? true,
      thresholdOverrides: parsed.data.thresholdOverrides,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: repoSettings.repo,
      set: {
        ...(parsed.data.defaultProvider !== undefined
          ? { defaultProvider: parsed.data.defaultProvider }
          : {}),
        ...(parsed.data.evalEnabled !== undefined
          ? { evalEnabled: parsed.data.evalEnabled }
          : {}),
        ...(parsed.data.thresholdOverrides !== undefined
          ? { thresholdOverrides: parsed.data.thresholdOverrides }
          : {}),
        updatedAt: new Date(),
      },
    });
  return c.json({ ok: true });
});
