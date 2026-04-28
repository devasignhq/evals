# DevAsign Eval

Internal eval dashboard that scores AI-generated code reviews from the existing
DevAsign code review agent using **Claude** or **Gemini** as the judge LLM.

This app is invisible to PR authors — no GitHub comments, no CI gates. It sits
alongside the DevAsign platform, listens for `review.completed` webhooks,
fetches the agent's review and indexed repo context, asks an LLM judge to score
it across four dimensions, and surfaces the results to the DevAsign team.

## Monorepo layout

```
backend/    Hono API server (Node 20+, Drizzle, Neon Postgres)
frontend/   React + Vite dashboard (TanStack Query, Recharts, Tailwind)
shared/     Shared TypeScript types
```

## Quick start

```bash
# install workspace deps
npm install

# backend env
cp backend/.env.example backend/.env
# fill in DATABASE_URL, ANTHROPIC_API_KEY, GEMINI_API_KEY,
# DEVASIGN_AGENT_API_URL/KEY, DEVASIGN_WEBHOOK_SECRET, GITHUB_TOKEN

# frontend env
cp frontend/.env.example frontend/.env
# VITE_USE_MOCK_DATA=true gives you the dashboard with seeded mock data

# create db schema
npm run db:migrate

# run both servers (backend on :3001, frontend on :5173)
npm run dev
```

## Eval pipeline

```
DevAsign webhook  →  POST /v1/webhooks/devasign  (HMAC verified)
                   ↓
              evalService
                   ├─ devasignService.fetchAgentReview(repo, prNumber)
                   ├─ devasignService.fetchIndexedContext(repo, files)
                   └─ githubService.fetchPRMetadata(repo, prNumber)
                   ↓
              judgeService (Claude or Gemini)
                   ↓
              evalResults table  →  Dashboard
```

The judge prompt is **identical between providers** — only the SDK call
differs. See `backend/src/services/judgeService.ts`.

## Scoring dimensions

| Dimension           | Weight | Default Threshold |
|---------------------|--------|-------------------|
| Relevance           | 0.30   | ≥ 7               |
| Accuracy            | 0.30   | ≥ 7               |
| Depth               | 0.20   | ≥ 6               |
| Regression Coverage | 0.20   | ≥ 6               |
| Overall (composite) | —      | ≥ 65 / 100        |

A run is `passed: true` only when **every** dimension and the overall
composite are above their thresholds.

## API surface

```
GET    /health
GET    /v1/providers
POST   /v1/evals/trigger             { repo, prNumber, provider? }
GET    /v1/evals                     ?repo&provider&from&to&page&limit
GET    /v1/evals/:runId
GET    /v1/evals/aggregate
GET    /v1/evals/trends
GET    /v1/repos
GET    /v1/repos/:org/:name/index
GET    /v1/repos/:org/:name/hotspot-coverage?days=30
GET    /v1/settings/repo/:org/:name
PUT    /v1/settings/repo/:org/:name
POST   /v1/webhooks/devasign         (HMAC, X-DevaSign-Signature header)
```

All routes except `/health` and the webhook are bearer-authenticated using
`EVAL_API_KEY`.

## Switching providers

Three layers, in priority order:

1. Per-eval — request body `"provider": "claude" | "gemini"`
2. Per-repo — `repo_settings.default_provider` (set from the Settings page)
3. Env default — `JUDGE_PROVIDER` (defaults to `claude`)

If the environment is missing one provider's API key, the system simply won't
offer that option — both keys are required for full functionality.
