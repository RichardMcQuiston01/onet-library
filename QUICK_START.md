# Quick Start

## Prerequisites

- [Bun](https://bun.sh) 1.0+
- An O\*NET API key (see [Requesting an API key](https://services.onetcenter.org/developer/))

## Getting started

```bash
git clone https://github.com/RichardMcQuiston01/onet-library.git
cd onet-library
bun install
cp .env.example .env   # then add your ONET_API_KEY
```

## Commands

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `bun run build`     | Compile to `dist/` (ESM + CJS + type declarations) |
| `bun run dev`       | Build in watch mode                                |
| `bun run test`      | Run tests in watch mode                            |
| `bun run test:run`  | Run tests once                                     |
| `bun run typecheck` | Type-check without emitting                        |
| `bun run lint`      | Lint `src/`                                        |

## Testing the package locally

```bash
bun run build
bun pack
# produces richardmcquiston01-onet-library-x.x.x.tgz
```

Install the tarball in another project to verify the published output before releasing.

## Using the library

```tsx
import { OnetClient, useOccupation } from "@richardmcquiston01/onet-library";

const client = new OnetClient("YOUR_API_KEY");

function OccupationCard({ code }: { code: string }) {
  const { data, loading, error } = useOccupation(client, code);

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div>
      <h2>{data.title}</h2>
      <p>{data.description}</p>
    </div>
  );
}
```

An O\*NET API key is required. Request one at [services.onetcenter.org/developer](https://services.onetcenter.org/developer/).
