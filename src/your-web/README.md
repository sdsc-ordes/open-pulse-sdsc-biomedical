# SDSC Projects Dashboard

A static Astro dashboard covering the Swiss Data Science Center's public GitHub work, sliced into five
research topics (Biomedical, Environmental, Energy, Digital Society, Large Infrastructure). Built on the
Open Pulse platform — see [`DASHBOARD.md`](./DASHBOARD.md) for the full plan, data reconnaissance, and
open framing calls.

## Requires Node 22+

Astro 7 requires Node `>=22.12.0`. If your default `node` is older, install one alongside it (e.g.
`brew install node@22`) and prefix commands with its `bin/` directory on `PATH`.

## Commands

Run from `src/your-web/`:

| Command                | Action                                                                          |
| :---------------------- | :------------------------------------------------------------------------------ |
| `npm install`            | Install dependencies                                                            |
| `cp ../../.env .`        | Copy the repo-root `.env` here (Open Pulse credentials — build-time only)       |
| `npm run fetch-data`     | Query Neo4j / OpenSearch / SPARQL / CHAOSS and bake fresh JSON into `src/data/` |
| `npm run dev`            | Start the dev server                                                            |
| `npm run check`          | Type-check the project                                                         |
| `npm run build`          | Build the static site to `./dist/` (no server runtime — ready for GitHub Pages) |
| `npm run preview`        | Preview the production build locally                                           |

## Data flow

`scripts/fetch-data.mjs` is the only thing that talks to the Open Pulse stores. It reads `.env`, queries
Neo4j/OpenSearch/op-collections/CHAOSS directly (same transports as the `query-*` skills), and writes
typed JSON into `src/data/` (`summary.json`, `topic-map.json`, `repos.json`, `health.json`,
`partners.json`, `coverage.json`). Every page imports those files at build time — the browser never talks
to a store. Re-run `npm run fetch-data` whenever the snapshot should refresh; `src/data/*.json` is
committed so `npm run build` works without credentials.

The topic → repo mapping in `topic-map.json` is **hand-classified**, not derived from GitHub tags — see
`DASHBOARD.md` for the classification and its judgment calls, and `/coverage/` on the running site for the
same gaps rendered as a to-do list.
