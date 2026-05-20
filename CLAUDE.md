# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a framework-agnostic React component library for interacting with the O*NET Web Services API, written in TypeScript. It will be published to NPM as `@richardmcquiston01/onet-library`.

## Commands

```bash
npm run build       # compile ESM + CJS + .d.ts into dist/
npm run dev         # build in watch mode
npm run typecheck   # tsc --noEmit
npm run test        # vitest (watch mode)
npm run test:run    # vitest (single run)
npm run lint        # eslint src/
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
