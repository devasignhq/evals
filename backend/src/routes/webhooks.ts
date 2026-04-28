import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { createDevasignService } from "../services/devasignService.js";
import { runEval } from "../services/evalService.js";
import { createGithubService } from "../services/githubService.js";

export const webhooksRouter = new Hono();

const webhookSchema = z.object({
  event: z.string(),
  repo: z.string(),
  prNumber: z.number().int().positive(),
  headSha: z.string().optional(),
  reviewId: z.string().optional(),
});

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

webhooksRouter.post("/devasign", async (c) => {
  const secret = process.env.DEVASIGN_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: "Server configuration error: missing webhook secret" }, 500);
  }

  const raw = await c.req.text();
  const sig = c.req.header("x-devasign-signature") ?? "";

  if (!sig || !verifySignature(raw, sig, secret)) {
    return c.json({ error: "invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid body", details: parsed.error.flatten() }, 400);
  }
  if (parsed.data.event !== "review.completed") {
    return c.json({ ok: true, ignored: true });
  }

  // Kick off async — don't block webhook response
  const data = parsed.data;
  void (async () => {
    try {
      const devasign = createDevasignService();
      const github = createGithubService();
      await runEval(
        { devasign, github },
        {
          repo: data.repo,
          prNumber: data.prNumber,
          headShaHint: data.headSha,
          agentReviewIdHint: data.reviewId,
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Webhook eval failed:", e);
    }
  })();

  return c.json({ ok: true, accepted: true });
});
