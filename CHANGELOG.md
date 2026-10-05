# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] — 2026-10-05

### Fixed
- **`useOccupationSearch` race condition:** a slow earlier search could overwrite newer results. Each new search now aborts the previous one, and only the latest response updates state.
- **Unescaped occupation codes:** codes are now validated against the O\*NET-SOC format (`00-0000.00`) and URL-encoded. A malformed code (including path-traversal input such as `../../about`) rejects with `OnetValidationError` before any request is sent.
- Declarative hooks no longer report a one-render "idle" state before their first fetch starts.

### Added
- `OnetClient` options: `baseUrl` (e.g. a server-side proxy so the API key stays out of the browser), `fetch`, `cacheTtlMs` and `cacheMaxEntries` (opt-in response caching with shared in-flight requests), plus `clearCache()`. The API key is now optional when a proxy supplies it.
- Every client method accepts a trailing `{ signal }` option. Hooks abort in-flight requests when their inputs change or they unmount.
- `getOccupationSummary(code, section, params?)` and `useOccupationSummary(...)` for fetching any summary section by name, typed through `OccupationSummarySectionMap`.
- Hooks for the remaining 11 summary sections: work styles, work activities, work context, technology skills, related occupations, interests, education, detailed work activities, apprenticeship, professional associations and military career summaries.
- Error classes `OnetError` (base), `OnetRequestError` (network failures and invalid JSON, with `cause`) and `OnetValidationError`. `OnetApiError` gains an `endpoint` field.
- `OccupationSearch` props: `pageSize` with previous/next paging, `onSelect`, `renderOccupation`, `placeholder`. The search box now has an accessible label.
- JSDoc on every public export.
- Prettier with Google TypeScript style settings (`bun run format`, `bun run format:check`; checked in CI) and an ESLint rule requiring explicit return types on exported functions.

### Changed
- Error messages are more descriptive: they name the endpoint and HTTP status and include the response body (truncated to 500 characters).
- While refetching, hooks keep the previous `data` visible instead of clearing it; check `loading` to tell whether it is current.
- HTTP handling moved from `OnetClient` into a separate `OnetTransport` class; `OnetClient` now only describes the endpoints.
- `typecheck` now covers test files. Builds use `tsconfig.build.json`, which excludes them.

## [1.2.0] — 2026-08-13

### Added
- **Automated NPM publishing** via GitHub Actions (`.github/workflows/publish.yml`). Pushing a `vX.Y.Z` tag lints, typechecks, tests, builds, and runs `npm publish --provenance --access public` using the repository's `NPM_TOKEN` secret. A guard step fails the run if the tag does not match the `version` in `package.json`.
- **Continuous integration** workflow (`.github/workflows/ci.yml`) running lint, typecheck, test, and build on pushes and pull requests to `dev` and `main`.

### Changed
- Replaced Vitest with **Bun's built-in test runner** (`bun test`). All test imports migrated from `vitest` to `bun:test`; `vi.fn()` replaced with `mock()`, global fetch stubbing replaced with direct `globalThis` assignment.
- Replaced `happy-dom` dev dependency with `@happy-dom/global-registrator` registered via a `bunfig.toml` preload, providing a consistent DOM environment for React hook tests.
- Development prerequisites updated from Node.js to **Bun 1.0+**. Install commands throughout the docs now use `bun install` / `bun run`.

### Added
- `bunfig.toml` — Bun project configuration; sets `test.preload` for DOM registration.
- `test-setup.ts` — Preload entry point; calls `GlobalRegistrator.register()` before any test file runs.
- **Comprehensive API client tests** in `OnetClient.test.ts` covering all 16 summary-section methods (previously only `skills` and `job_zone` were tested):
  - `getOccupationAbilities` — path routing + pagination params
  - `getOccupationKnowledge` — path routing
  - `getOccupationWorkStyles` — path routing
  - `getOccupationWorkActivities` — path routing
  - `getOccupationWorkContext` — path routing + typed response-distribution payload
  - `getOccupationTasks` — path routing + typed task list payload
  - `getOccupationTechnologySkills` — path routing + hot-technology flag
  - `getOccupationRelatedOccupations` — path routing
  - `getOccupationInterests` — path routing + interest code + element payload
  - `getOccupationEducation` — path routing + percentage-of-respondents payload
  - `getOccupationDetailedWorkActivities` — path routing
  - `getOccupationApprenticeship` — path routing
  - `getOccupationProfessionalAssociations` — path routing + typed association category
  - `getOccupationMilitaryCareerSummaries` — path routing + typed career summary list
- **Hook tests** for three previously untested declarative hooks (`useOccupationAbilities`, `useOccupationKnowledge`, `useOccupationTasks`): idle-when-null and fetch-resolves cases.
- Test count grew from 34 to **55 tests** across 3 files.

### Removed
- `vitest.config.ts` — superseded by `bunfig.toml`.
- `vitest` dev dependency.
- `happy-dom` dev dependency (replaced by `@happy-dom/global-registrator`).

---

## [0.0.1] — 2026-05-20

### Added
- `OnetClient` — typed HTTP client for the O\*NET Web Services v2 `/online` portal.
  - `searchOccupations` — keyword search with optional pagination.
  - `getOccupation` — occupation overview by O\*NET-SOC code.
  - Summary-section methods for abilities, skills, knowledge, work styles, work activities, work context, tasks, technology skills, related occupations, job zone, interests, education, detailed work activities, apprenticeship, professional associations, and military career summaries.
- `OnetApiError` — typed error class carrying the HTTP `.status` code.
- `useOccupationSearch` — imperative React hook for keyword search; returns `{ data, loading, error, search }`.
- `useOccupation` — declarative hook; fetches an occupation overview when `code` is non-null and resets to idle when `code` becomes `null`.
- `useOccupationSkills`, `useOccupationAbilities`, `useOccupationKnowledge`, `useOccupationTasks` — declarative hooks for the corresponding summary sections; accept optional `{ start, end }` pagination.
- `useOccupationJobZone` — declarative hook for the job zone summary.
- `OccupationSearch` — ready-made search form and result list component backed by `useOccupationSearch`.
- Full TypeScript type exports for all API response shapes and hook return types.
- ESM + CJS dual output via `tsup`; `.d.ts` declarations and source maps included.
- Vitest test suite with 34 tests covering the client, search hook, and occupation detail hooks.
