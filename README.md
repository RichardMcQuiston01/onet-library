# onet-library

A framework-agnostic React component library for interacting with the [O\*NET Web Services API](https://services.onetcenter.org/reference/start/overview), written in TypeScript.

## Installation

```bash
npm install @richardmcquiston01/onet-library
```

React 18 or later is required as a peer dependency.

## Setup

An O\*NET Web Services API key is required. You can request one at [https://services.onetcenter.org/developer/](https://services.onetcenter.org/developer/).

## Development

### Prerequisites

- Node.js 18+
- An O\*NET API key (see [Requesting an API key](https://services.onetcenter.org/developer/))

### Getting started

```bash
git clone https://github.com/RichardMcQuiston01/onet-library.git
cd onet-library
npm install
cp .env.example .env   # then add your ONET_API_KEY
```

### Commands

| Command | Description |
|---|---|
| `npm run build` | Compile to `dist/` (ESM + CJS + type declarations) |
| `npm run dev` | Build in watch mode |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint `src/` |

### Testing the package locally

Use `npm pack` to produce a `.tgz` tarball and install it in another project to verify the published output before releasing:

```bash
npm pack
# produces richardmcquiston01-onet-library-x.x.x.tgz
```

## Publishing

```bash
npm run build
npm publish
```

The `publishConfig` in `package.json` sets public access automatically, so no extra flags are needed.

## API coverage

The library wraps the O\*NET Web Services v2 API. Endpoints are grouped into four portals:

| Portal | Base path | Description |
|---|---|---|
| Online | `/online` | Full occupational data — occupations, skills, abilities, knowledge, interests, work activities, job zones, crosswalks, and more |
| Veterans | `/veterans` | Career exploration for veterans, including military job matching |
| My Next Move | `/mnm` | Career exploration with Interest Profiler |
| My Next Move for Parents | `/mpp` | Same as My Next Move, aimed at parents |

The full API schema is at [`resources/onet-web-services-openapi.json`](resources/onet-web-services-openapi.json).

## Resources

- [O\*NET Web Services API reference](https://services.onetcenter.org/reference/start/overview)
- [O\*NET Web Services samples](https://github.com/onetcenter/web-services-v2-samples/)

## License

MIT
