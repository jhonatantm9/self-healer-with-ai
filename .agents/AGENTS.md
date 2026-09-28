# AGENTS.md

## Commands

- **Install dependencies**: `npm ci`
- **Install Playwright browsers**: `npx playwright install --with-deps`
- **Run tests**: `npx playwright test`
- **Run tests headed**: `npx playwright test --headed`
- **Show trace viewer**: `npx playwright test --trace=on`
- **Run CI**: `.github/workflows/playwright.yml` uses `npm ci && npx playwright install --with-deps && npx playwright test`

## Test structure

- Tests in `tests/`: `product.spec.ts`
- Page objects in `pages/`: `HomePage.ts`, `ProductDetailsPage.ts`
- Tests use `@playwright/test` with `test` and `expect`
- `product.spec.ts` uses the Page Object pattern (HomePage, ProductDetailsPage)
- **Import convention**: `import { test, expect } from '../tests/fixtures'` (instead of `@playwright/test`)

## Self-healer (MVP completed)

- Code in `src/healer/`: `types.ts`, `llm-client.ts`, `prompt-builder.ts`, `healer.ts`, `report-store.ts`
- All MVP steps 1-12 completed; only CI (step 13) pending
- Env vars (`.env`, gitignored; template in `.env.template`): `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, `HEALER_ENABLED=true`
- Env loaded with `dotenv` (`import 'dotenv/config'`) in `tests/fixtures.ts` only; `HEALER_ENABLED=false` disables Gemini calls (cost control)
- Healer reports written to `test-results/healing/` (gitignored)

## Key conventions

- `HomePage.goto()` at `pages/HomePage.ts:14` auto-closes a welcome modal if visible
- `product.spec.ts` navigates to `https://playground.qatools.dev/`
- Tests run in parallel by default (`fullyParallel: true` in config)
- Retries: 0 locally, 2 on CI (`retries` in config)
- Reporter: `html` (output in `playwright-report/`)
- Screenshot: `only-on-failure`; trace: `on-first-retry`
- **`test.afterEach` in `tests/fixtures.ts`**: captures DOM + screenshot on failure, triggers healer if `HEALER_ENABLED=true`

## No custom npm scripts

`package.json` has an empty `scripts` section. All commands use `npx playwright` directly.