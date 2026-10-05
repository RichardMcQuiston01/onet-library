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

The `OnetClient` class is the core HTTP layer. Create it once and pass it to hooks and components.

```typescript
import { OnetClient } from "@richardmcquiston01/onet-library";

const client = new OnetClient("YOUR_API_KEY");
```

### Options

The constructor takes an optional second argument:

| Option            | Type        | Default                               | Description                                                         |
| ----------------- | ----------- | ------------------------------------- | ------------------------------------------------------------------- |
| `baseUrl`         | `string`    | `https://services.onetcenter.org/ws`  | Root URL for requests. Point it at your own proxy (see below).      |
| `fetch`           | `FetchLike` | global `fetch`                        | Custom `fetch` implementation (testing, SSR, retries).              |
| `cacheTtlMs`      | `number`    | `0` (off)                             | Reuse successful responses for this many ms; identical in-flight requests are shared. |
| `cacheMaxEntries` | `number`    | `100`                                 | Cache size limit; the oldest entry is evicted first.                |

```typescript
const client = new OnetClient("YOUR_API_KEY", { cacheTtlMs: 5 * 60_000 });
client.clearCache(); // drop cached responses
```

### Keeping your API key private

In a browser app, any key passed to `OnetClient` is visible to visitors. For public sites, forward requests through your own server endpoint that adds the `X-API-Key` header, and leave the key out on the client:

```typescript
const client = new OnetClient(undefined, { baseUrl: "/api/onet" });
```

### Methods

Every method returns a typed promise and accepts a trailing `{ signal }` option to cancel the request. `code` is an O\*NET-SOC code such as `15-1252.00`; malformed codes are rejected before any request is sent.

| Method                                          | Returns                                   |
| ----------------------------------------------- | ----------------------------------------- |
| `searchOccupations({ keyword, start?, end? })`  | `Promise<OccupationSearchResult>`         |
| `getOccupation(code)`                           | `Promise<OccupationOverview>`             |
| `getOccupationSummary(code, section, params?)`  | Type for `section` (see below)            |

`getOccupationSummary` fetches any summary section by name, which helps when the section is chosen at runtime. Each section also has a named shortcut. Paginated sections accept an optional `{ start?, end? }` (1-based, inclusive), marked `*` below.

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

All hooks take the `client` as their first argument. Declarative hooks (everything except `useOccupationSearch`) fetch automatically when `code` or the page bounds change, and stay idle when `code` is `null`. When inputs change or the component unmounts, the in-flight request is aborted, so a late response can never overwrite newer data.

Every declarative hook returns an `OnetQueryResult<T>`:

```typescript
interface OnetQueryResult<T> {
  data: T | null; // keeps the previous response while a refetch loads
  loading: boolean;
  error: Error | null;
}
```

Because `data` stays visible during a refetch, check `loading` if you need to know whether it matches the current `code`.

### `useOccupationSearch`

An imperative hook for keyword search. Calling `search` aborts any search still in flight, so only the latest results are shown.

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

### `useOccupation`

Fetches the top-level overview for an occupation (title, description, tags, section links).

```tsx
const { data, loading, error } = useOccupation(client, "15-1252.00");
// data: OccupationOverview | null
```

### `useOccupationSummary`

Fetches any summary section by name. The return type follows the section.

```tsx
const { data } = useOccupationSummary(client, "15-1252.00", "skills", { start: 1, end: 10 });
// data: OccupationElementSummary | null
```

Page bounds are compared by value, so passing an inline `{ start, end }` object does not cause extra requests.

### Section hooks

Each summary section also has its own hook. Paginated hooks accept an optional third `params` argument.

| Hook                                    | Data type                         |
| --------------------------------------- | --------------------------------- |
| `useOccupationSkills`                   | `OccupationElementSummary`        |
| `useOccupationAbilities`                | `OccupationElementSummary`        |
| `useOccupationKnowledge`                | `OccupationElementSummary`        |
| `useOccupationWorkStyles`               | `OccupationElementSummary`        |
| `useOccupationWorkActivities`           | `OccupationElementSummary`        |
| `useOccupationWorkContext`              | `WorkContextSummary`              |
| `useOccupationTasks`                    | `TasksSummary`                    |
| `useOccupationTechnologySkills`         | `TechnologySkillsSummary`         |
| `useOccupationRelatedOccupations`       | `RelatedOccupationsSummary`       |
| `useOccupationJobZone`                  | `JobZoneSummary` (no params)      |
| `useOccupationInterests`                | `InterestsSummary` (no params)    |
| `useOccupationEducation`                | `EducationSummary` (no params)    |
| `useOccupationDetailedWorkActivities`   | `DetailedWorkActivitiesSummary`   |
| `useOccupationApprenticeship`           | `ApprenticeshipSummary`           |
| `useOccupationProfessionalAssociations` | `ProfessionalAssociationsSummary` |
| `useOccupationMilitaryCareerSummaries`  | `MilitaryCareerSummariesResult`   |

```tsx
const { data } = useOccupationTasks(client, "15-1252.00", { start: 1, end: 5 });
// data.task — array of { id, title, related }
```

---

## OccupationSearch component

A ready-made, unstyled search box with a result count, result list, and previous/next paging.

```tsx
import { OnetClient, OccupationSearch } from "@richardmcquiston01/onet-library";

const client = new OnetClient("YOUR_API_KEY");

function App() {
  return (
    <OccupationSearch
      client={client}
      pageSize={10}
      onSelect={(occupation) => console.log(occupation.code)}
    />
  );
}
```

**Props:**

| Prop               | Type                                    | Description                                                              |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------ |
| `client`           | `OnetClient`                            | The API client instance (required)                                       |
| `pageSize`         | `number`                                | Results per page. Default `20`.                                          |
| `placeholder`      | `string`                                | Search box placeholder.                                                  |
| `onSelect`         | `(occupation) => void`                  | Called when a result is clicked; results render as buttons when set.     |
| `renderOccupation` | `(occupation) => ReactNode`             | Custom content for each result row.                                      |

By default each row shows the title, O\*NET-SOC code, and a ★ for Bright Outlook roles. Errors appear in an element with `role="alert"`.

---

## Error handling

Every error the library throws extends `OnetError`:

| Class                 | When                                                                  | Extra fields          |
| --------------------- | --------------------------------------------------------------------- | --------------------- |
| `OnetApiError`        | The API answered with a non-2xx status                                | `status`, `endpoint`  |
| `OnetRequestError`    | The network call failed, or the response was not valid JSON           | `endpoint`, `cause`   |
| `OnetValidationError` | An argument was malformed (e.g. a bad O\*NET-SOC code); nothing sent  | —                     |

Messages name the endpoint and include the response body, e.g. `O*NET request GET /online/occupations/00-0000.00/ failed with HTTP 404 Not Found: …`.

```typescript
import { OnetApiError, OnetError } from "@richardmcquiston01/onet-library";

try {
  const result = await client.searchOccupations({ keyword: "nurse" });
} catch (err) {
  if (err instanceof OnetApiError && err.status === 401) {
    console.error("Check your O*NET API key:", err.message);
  } else if (err instanceof OnetError) {
    console.error(err.message);
  }
}
```

Aborted requests reject with the standard `AbortError` and are never wrapped.

---

## TypeScript

The library ships `.d.ts` declarations, source maps, and JSDoc on every public export. All public types are exported from the package root, including:

```typescript
import type {
  OnetClientOptions,
  RequestOptions,
  OnetQueryResult,
  OccupationSummarySection,
  OccupationSummarySectionMap,
  OccupationOverview,
  OccupationElementSummary,
  OccupationSearchResult,
  JobZoneSummary,
  TasksSummary,
  PaginationParams,
} from "@richardmcquiston01/onet-library";
```

Response fields use snake_case to match the O\*NET JSON exactly.

---

## Resources

- [O\*NET Web Services API reference](https://services.onetcenter.org/reference/start/overview)
- [O\*NET Web Services samples](https://github.com/onetcenter/web-services-v2-samples/)

## License

MIT
