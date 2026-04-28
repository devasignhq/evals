import type { MiddlewareHandler } from "hono";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const expected = process.env.EVAL_API_KEY;
  if (!expected) {
    return c.json({ error: "Server configuration error: missing API key" }, 500);
  }
  const header = c.req.header("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (token !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
};
