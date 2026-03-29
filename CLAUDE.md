# CLAUDE.md

## Project overview

GitHub Action that sends Slack notifications for GitHub Actions workflows, jobs, and steps. Used by 3000+ public repos. Published to the GitHub Marketplace as [act10ns/slack](https://github.com/marketplace/actions/slack-action-status).

## Architecture

- `src/main.ts` — Entry point. Reads action inputs, parses config, splits channels, calls `send()` for each
- `src/slack.ts` — Core logic. Builds Slack message from GitHub context using Handlebars templates, sends via `@slack/webhook`
- `src/handlebars.ts` — Registers custom Handlebars helpers (json, truncate, default, pluralize, eq, neq, etc.)
- `action.yml` — GitHub Action metadata (inputs, runtime)
- `dist/index.js` — Bundled output via `@vercel/ncc` (committed to repo, required for GitHub Actions)

## Build and test

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm run package      # Bundle with ncc into dist/
npm run format       # Run prettier
npm run format-check # Check prettier (CI uses this)
npm run lint         # Run eslint
npm test             # Run jest tests
npm run all          # build + format + lint + package + test
```

## Key conventions

- **Node.js 24** runtime (set in `action.yml`)
- **TypeScript** compiled to `lib/`, bundled to `dist/` via ncc
- **Prettier** config: 120 char width, 2-space indent, no semicolons, single quotes, no trailing commas
- **Jest** for testing with `axios-mock-adapter` for HTTP mocking
- Tests are in `__tests__/` with fixtures in `__tests__/fixtures/`
- `dist/` is committed — must be rebuilt (`npm run package`) before pushing changes to source

## Important patterns

- User-controlled data (`payload`, `description`) is sanitized via `escapeHandlebars()` before passing to templates
- Steps with auto-generated hex hash IDs (32-char hex) are filtered out
- Webhook send has retry logic (3 attempts with linear backoff)
- Multi-channel support: `channel` input is split on whitespace/commas
- `blocks_only` config option omits the legacy attachment
- Config file is parsed with `FAILSAFE_SCHEMA` (all values as strings)

## PR workflow

- Branch from `master`
- Run `npm run format-check` before pushing (CI lint step checks this)
- Run `npm test` to verify all tests pass
- Rebuild `dist/` if source changed: `npm run build && npm run package`
- dist files should be included in PRs that change source code
