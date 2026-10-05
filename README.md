# @richardmcquiston01/onet-library

Search and explore career data from the [O\*NET Web Services API](https://services.onetcenter.org/reference/start/overview) in your React app. Look up jobs and see the skills, abilities, knowledge, tasks, and education they need. The library gives you a ready-to-use API client, React hooks, and a search component, all written in TypeScript.

It covers the O\*NET `/online` portal. The `/veterans`, `/mnm`, and `/mpp` portals, plus crosswalks, industry lookups, and the Interest Profiler, are not wrapped yet. You can still reach them by extending `OnetClient` or calling `fetch` with your API key. The full API schema is in [`resources/onet-web-services-openapi.json`](resources/onet-web-services-openapi.json).

## Installation

```bash
bun add @richardmcquiston01/onet-library
# or
npm install @richardmcquiston01/onet-library
```

React 18 or later is required as a peer dependency.

## Quick start

See [QUICK_START.md](QUICK_START.md) for setup, commands, local testing, and a usage example.

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

---

## OnetClient

The `OnetClient` class is the core HTTP layer. Instantiate it once with your API key and pass it down to hooks or components.

```typescript
import { OnetClient } from "@richardmcquiston01/onet-library";

const client = new OnetClient("YOUR_API_KEY");
```

All methods return typed promises and throw `OnetApiError` (which carries a `.status` code) on non-2xx responses.

### Search

| Method                                         | Returns                           |
| ---------------------------------------------- | --------------------------------- |
| `searchOccupations({ keyword, start?, end? })` | `Promise<OccupationSearchResult>` |

### Occupation overview

| Method                | Returns                       |
| --------------------- | ----------------------------- |
| `getOccupation(code)` | `Promise<OccupationOverview>` |

### Summary sections

All summary methods accept an optional `{ start?, end? }` pagination object (marked `*` below). `code` is an O\*NET-SOC code such as `15-1252.00`.

| Method                                                 | Section                     | Returns                                    |
| ------------------------------------------------------ | --------------------------- | ------------------------------------------ |
| `getOccupationAbilities(code, params*)`                | `abilities`                 | `Promise<OccupationElementSummary>`        |
| `getOccupationSkills(code, params*)`                   | `skills`                    | `Promise<OccupationElementSummary>`        |
| `getOccupationKnowledge(code, params*)`                | `knowledge`                 | `Promise<OccupationElementSummary>`        |
| `getOccupationWorkStyles(code, params*)`               | `work_styles`               | `Promise<OccupationElementSummary>`        |
| `getOccupationWorkActivities(code, params*)`           | `work_activities`           | `Promise<OccupationElementSummary>`        |
| `getOccupationWorkContext(code, params*)`              | `work_context`              | `Promise<WorkContextSummary>`              |
| `getOccupationTasks(code, params*)`                    | `tasks`                     | `Promise<TasksSummary>`                    |
| `getOccupationTechnologySkills(code, params*)`         | `technology_skills`         | `Promise<TechnologySkillsSummary>`         |
| `getOccupationRelatedOccupations(code, params*)`       | `related_occupations`       | `Promise<RelatedOccupationsSummary>`       |
| `getOccupationJobZone(code)`                           | `job_zone`                  | `Promise<JobZoneSummary>`                  |
| `getOccupationInterests(code)`                         | `interests`                 | `Promise<InterestsSummary>`                |
| `getOccupationEducation(code)`                         | `education`                 | `Promise<EducationSummary>`                |
| `getOccupationDetailedWorkActivities(code, params*)`   | `detailed_work_activities`  | `Promise<DetailedWorkActivitiesSummary>`   |
| `getOccupationApprenticeship(code, params*)`           | `apprenticeship`            | `Promise<ApprenticeshipSummary>`           |
| `getOccupationProfessionalAssociations(code, params*)` | `professional_associations` | `Promise<ProfessionalAssociationsSummary>` |
| `getOccupationMilitaryCareerSummaries(code, params*)`  | `military_career_summaries` | `Promise<MilitaryCareerSummariesResult>`   |

---

## React hooks

All hooks accept a `client` instance as the first argument. Declarative hooks (everything except `useOccupationSearch`) fetch automatically when their `code` argument changes and stay idle when `code` is `null`.

Every declarative hook returns an `OnetQueryResult<T>`:

```typescript
interface OnetQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
```

### `useOccupationSearch`

An imperative hook for keyword search. The returned `search` function triggers a new request.

```tsx
import { useOccupationSearch } from "@richardmcquiston01/onet-library";

function SearchPage() {
  const { data, loading, error, search } = useOccupationSearch(client);

  return (
    <>
      <button onClick={() => search({ keyword: "nurse" })}>Search</button>
      {loading && <p>Searching…</p>}
      {data?.occupation.map((occ) => (
        <p key={occ.code}>{occ.title}</p>
      ))}
    </>
  );
}
```

**Signature:** `useOccupationSearch(client) → { data, loading, error, search }`

### `useOccupation`

Fetches the top-level overview for an occupation (title, description, tags, section links).

```tsx
const { data, loading, error } = useOccupation(client, "15-1252.00");
// data: OccupationOverview | null
```

### `useOccupationSkills`

```tsx
const { data } = useOccupationSkills(client, "15-1252.00");
// data: OccupationElementSummary | null
// data.element — array of { id, name, description, related }
```

Accepts optional pagination: `useOccupationSkills(client, code, { start: 1, end: 10 })`.

### `useOccupationAbilities`

```tsx
const { data } = useOccupationAbilities(client, "15-1252.00");
// data: OccupationElementSummary | null
```

### `useOccupationKnowledge`

```tsx
const { data } = useOccupationKnowledge(client, "15-1252.00");
// data: OccupationElementSummary | null
```

### `useOccupationTasks`

```tsx
const { data } = useOccupationTasks(client, "15-1252.00");
// data: TasksSummary | null
// data.task — array of { id, title, related }
```

### `useOccupationJobZone`

```tsx
const { data } = useOccupationJobZone(client, "15-1252.00");
// data: JobZoneSummary | null
// data.code — 1–5 (preparation level)
// data.title, data.education, data.related_experience, etc.
```

---

## OccupationSearch component

A ready-made search input that wires `useOccupationSearch` to a form and result list.

```tsx
import { OnetClient, OccupationSearch } from "@richardmcquiston01/onet-library";

const client = new OnetClient("YOUR_API_KEY");

function App() {
  return <OccupationSearch client={client} />;
}
```

**Props:**

| Prop     | Type         | Description             |
| -------- | ------------ | ----------------------- |
| `client` | `OnetClient` | The API client instance |

The component renders a search input with a submit button, a result count, an unordered list of occupations (title, O\*NET-SOC code, and a ★ for Bright Outlook roles), and an error message on failure.

---

## Error handling

```typescript
import { OnetApiError } from "@richardmcquiston01/onet-library";

try {
  const result = await client.searchOccupations({ keyword: "nurse" });
} catch (err) {
  if (err instanceof OnetApiError) {
    console.error(`API error ${err.status}: ${err.message}`);
  }
}
```

`OnetApiError` extends `Error` and adds a `.status` number (the HTTP status code).

---

## TypeScript

The library ships `.d.ts` declarations and full source maps. All public types are exported from the package root:

```typescript
import type {
  OccupationOverview,
  OccupationElementSummary,
  OccupationSearchResult,
  JobZoneSummary,
  TasksSummary,
  WorkContextSummary,
  TechnologySkillsSummary,
  InterestsSummary,
  EducationSummary,
  RelatedOccupationsSummary,
  ProfessionalAssociationsSummary,
  MilitaryCareerSummariesResult,
  DetailedWorkActivitiesSummary,
  ApprenticeshipSummary,
  PaginationParams,
  OnetQueryResult,
} from "@richardmcquiston01/onet-library";
```

---

## Resources

- [O\*NET Web Services API reference](https://services.onetcenter.org/reference/start/overview)
- [O\*NET Web Services samples](https://github.com/onetcenter/web-services-v2-samples/)

## License

MIT
