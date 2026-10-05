# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript library for the O*NET Web Services API: a typed API client (`OnetClient`, with HTTP handled by `OnetTransport`), React hooks for every occupation summary section, and an `OccupationSearch` component. Published to NPM as `@richardmcquiston01/onet-library`.

Only the `/online` portal is wrapped so far. Releases publish from `main` when a `vX.Y.Z` tag is pushed (`.github/workflows/publish.yml`); the tag must match `package.json`.

## Commands

```bash
bun run build         # compile ESM + CJS + .d.ts into dist/
bun run dev           # build in watch mode
bun run typecheck     # tsc --noEmit (includes test files)
bun run test          # bun test (watch mode)
bun run test:run      # bun test (single run)
bun run lint          # eslint src/
bun run format        # prettier (Google TypeScript style: semicolons, single quotes)
bun run format:check  # verify formatting (runs in CI)
```

## Environment Setup

Copy `.env.example` to `.env` and set `ONET_API_KEY` with a valid O*NET API key. The API authenticates via an `X-API-Key` request header.

## O*NET API Structure

The full API schema is at `resources/onet-web-services-openapi.json`. The API base URL is `https://services.onetcenter.org/ws/`. Endpoints are organized into four portals:

- **`/online`** — Full O*NET occupational data: occupations, job families, job zones, bright outlook, STEM, skills, abilities, knowledge, interests, work activities, work context, work styles, technology, crosswalks (SOC, DOT, RAPIDS, ESCO, military, education, occupation handbook), industries, career clusters, associations, and Interest Profiler (via `/online/soft_skills/`).
- **`/veterans`** — Career exploration for veterans: search, military job matching, job preparation levels, interests, industries, career clusters, bright outlook.
- **`/mnm`** — My Next Move portal: same structure as `/veterans` plus Interest Profiler.
- **`/mpp`** — My Next Move for Parents portal: same structure as `/mnm`.

Supporting endpoints: `/taxonomy/{source}/{target}/{code}` for crosswalk lookups, `/database/` for raw table access, `/about/` for service metadata.

Occupation detail endpoints follow the pattern `/online/occupations/{code}/details/{section}` and `/online/occupations/{code}/summary/{section}`, where `{code}` is an O*NET-SOC code (e.g., `15-1252.00`).

Paginated list responses include `start`, `end`, `total`, `prev`, and `next` fields alongside the results array.

## References

- [O*NET API Overview](https://services.onetcenter.org/reference/start/overview)
- [O*NET Web Services Samples](https://github.com/onetcenter/web-services-v2-samples/)
