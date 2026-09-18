# AGENTS.md

## Commands

- **Install dependencies**: `npm ci`
- **Install Playwright browsers**: `npx playwright install --with-deps`
- **Run tests**: `npx playwright test`
- **Run tests headed**: `npx playwright test --headed`
- **Show trace viewer**: `npx playwright test --trace=on`
- **Run CI**: `.github/workflows/playwright.yml` uses `npm ci && npx playwright install --with-deps && npx playwright test`

## Test structure

- Tests in `tests/`: `example.spec.ts`, `product.spec.ts`
- Page objects in `pages/`: `HomePage.ts`, `ProductDetailsPage.ts`
- Tests use `@playwright/test` with `test` and `expect`
- `product.spec.ts` uses the Page Object pattern (HomePage, ProductDetailsPage)

## Key conventions

- `HomePage.goto()` at `pages/HomePage.ts:14` auto-closes a welcome modal if visible
- `product.spec.ts` navigates to `https://playground.qatools.dev/`
- Tests run in parallel by default (`fullyParallel: true` in config)
- Retries: 0 locally, 2 on CI (`retries` in config)
- Reporter: `html` (output in `playwright-report/`)

## No custom npm scripts

`package.json` has an empty `scripts` section. All commands use `npx playwright` directly.