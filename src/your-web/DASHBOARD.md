# SDSC Projects Dashboard — plan

## Revision — 2026-08-31

Post-launch feedback changed several things from the plan below (the plan text still says "topic" throughout — that's the internal name only; the product now calls it a **Vertical**):

- **Terminology**: every user-facing "research topic" became "Vertical" / "Verticals". Internal identifiers (`TopicSlug`, `/topics/` routes, `TOPIC_MAP`) were kept as-is to limit churn — a deliberate naming mismatch between internals and UI copy.
- **Landing page**: rewritten around "The Verticals in SDSC" with a coverage disclaimer (open-source only, known GitHub orgs only, Vertical allocation may contain errors — flagged to the Open Pulse team via a link to `sdsc-ordes/open-pulse` issues). The org-wide growth chart was replaced with a grouped, colour-coded-by-Vertical chart (colours in `src/lib/vertical-colors.mjs`).
- **Coverage panel removed.** Replaced by a first-class **Cross-cutting tooling** page (`/cross-cutting-tooling/`) listing the 54 repos with no Vertical tag, in the same table + CHAOSS-metrics shape as a Vertical's Landscape page.
- **Landscape table** (per Vertical, and cross-cutting tooling) gained **People** (GitHub contributor-list count) and **Last commit** (max `commit_date` from OpenSearch, bulk-fetched once for all 96 repos) columns.
- **Per-project CHAOSS metrics explorer** added below every Landscape table: the full metric lists of the [OSS Project Viability Starter](https://www.chaoss.community/kb/metrics-model-project-viability-starter/) and [Community Activity](https://www.chaoss.community/kb/metrics-model-community-activity/) CHAOSS models, computed for **every** repo in that section (not just a flagship), with a toggleable per-project legend and a click-to-expand info popover per metric (method/caveats/reference link). Metrics in a model that Open Pulse's CHAOSS API doesn't compute at all are labelled "Under works" rather than hidden — mapping lives in `src/lib/chaoss-models.ts`. This superseded the old single-flagship CHAOSS block on the Health & Activity page, which now only carries the 5-year chart and 90-day activity ranking.
- `scripts/fetch-data.mjs` now fetches CHAOSS metrics for all 96 repos (`chaoss.json`, ~4MB — read at build time only, never shipped to the client wholesale) instead of 5 flagships.

## Revision — 2026-09-01

- **Landing "growth" chart is repo-count, not commits.** Cumulative non-fork repo count per Vertical by `createdAt` year (`summary.json` → `topics[].repoGrowthSeries`) — ecosystem growth. Commit-volume trend stays on each Vertical's own Health page (per-repo/Vertical activity), matching the CLAUDE.md distinction between the two growth cuts.
- **Active / Archive split.** Every Landscape-shaped page (`/topics/<slug>/`, `/cross-cutting-tooling/`) now splits its repos into an "Active projects" table (a commit in the trailing 365 days) and an "Archived projects" table (dormant, not deleted) below the CHAOSS section. Split logic: `splitActiveArchive()` in `src/lib/topics.ts`.
- **Sortable tables.** `RepoTable.astro` replaces the old inline `<table>` markup — click a column header to sort, click again to reverse. Used for both Active and Archive tables.
- **CHAOSS metrics windowed to 365 days**, not the API's 3650-day default (`?window=365` in `fetch-data.mjs` — 365 is an exact snap bucket, no rounding).
- **Community Activity model removed** ("not enough info", per feedback) — `src/lib/chaoss-models.ts` now carries only OSS Project Viability Starter.
- **Additional metrics section added** below the model: Code Review Count, Self Merge Rate, Change Request Review Duration (approximated by Open Pulse's "Change Request Duration" — flagged in the UI), Code Changes Lines, Issues Active, Issues Closed, Issue Age, Upstream Code Dependencies — all real chaoss.community metrics, matched to Open Pulse's CHAOSS API catalogue by exact name. **Issue Age has no Open Pulse data** (no matching slug in the 35-metric catalogue) and renders "Under works"; the other seven are live.
- **Project Velocity** rebuilt as the scatter plot the CHAOSS metric page itself describes (x = code changes, y = issues closed + reviews, dot size = committers, all log-scaled) — a genuine composite from four real Open Pulse metrics, not a placeholder. `ProjectVelocityChart.astro`.
- **Every metric name is a clickable link** to its real chaoss.community definition page, verified live (not URL-pattern-guessed) — including metrics Open Pulse doesn't compute, so "Under works" metrics are still referenceable.
- CHAOSS metrics (models + additional list + Project Velocity) are now scoped to **active projects only** per section, consistent with the 365-day window.

## Revision — 2026-09-02

- Landing disclaimer now also states that each Vertical's work spans **many internal SDSC teams** (not one team per Vertical), and that every number on the site is a **build-time snapshot**, not live data.
- **Landing growth chart is per-year new repos, not cumulative** — `summary.json` → `topics[].repoGrowthSeries` now counts repos by `createdAt` year exactly (`===`), not `<=` running total.
- **Additional metrics pruned per review**: removed "Issue Age" (no matching Open Pulse metric at all), "Issues Active" / "Issues Closed" (real metrics, but every active repo returns 0 in the 365-day window — verified against `chaoss.json`, not just assumed). "Change Request Review Duration" renamed back to its real CHAOSS name, "Change Request Duration".
- **Upstream Code Dependencies** is no longer a plain-value card — `UpstreamDependenciesCard.astro` is a full-width widget listing the actual dependency repo names (from the CHAOSS API's `examples` field), each linking to GitHub.
- Confirmed a real coverage-gap class while investigating a missing repo (`sdsc-ordes/compass`): some repos exist in Neo4j only as a bare stub node (an `OWNS` edge and a `full_name`, no other properties — discovered via a fork/dependency reference, never actually crawled) and are absent from the op-collections GitHub index this dashboard's snapshot reads from. Not fixed here — flagged as a real Open Pulse data gap, referenced in the landing disclaimer's coverage note.

## Revision — 2026-09-03: GitHub Pages deploy

- `.github/workflows/pages.yml` — deploys `src/your-web` to GitHub Pages on every push to `main` (build → `upload-pages-artifact` → `deploy-pages`). Node version comes from `package.json`'s `engines` field (`node-version-file`), matching the `ci.yml` fix for the same "Node 20 can't run Astro 7" failure. Optionally refreshes `src/data/*.json` before building if `OPENPULSE_ENDPOINT`/`OPENPULSE_AUTH` repo secrets are set; otherwise deploys from whatever snapshot is already committed.
- **This repo is a GitHub Pages *project* page**, not a `<org>.github.io` root site — `astro.config.mjs` sets `site`/`base` to `https://sdsc-ordes.github.io/open-pulse-sdsc-biomedical`. Every internal link in the app now goes through `src/lib/url.ts`'s `url()` helper (prepends `import.meta.env.BASE_URL`) instead of a bare `href="/..."` — Astro does not rewrite hand-written absolute paths for you, only its own bundled assets. Confirmed via a built-`dist/` grep and a live preview-server click-through.
- To actually go live: enable *Settings → Pages → Source: GitHub Actions* on the repo (not something this agent can do) — the workflow deploys on the next push to `main` after that.

## Revision — 2026-09-04

- **Coverage disclaimer now on every Vertical page** (Landscape/Community/Health), not just the landing page — extracted to `CoverageDisclaimer.astro`, reused verbatim. Removed the separate per-vertical "N repos have a judgment-call assignment" warning box (now redundant with the disclaimer's own misclassification note).
- **Keywords and Disciplines columns added** to every Active/Archive repo table (`RepoTable.astro`), sortable like the rest. Keywords = GitHub's own repo topics (op-collections `github_repos.topics`, already fetched — no new query). Disciplines = SPARQL `op:discipline` (Wikidata QIDs), resolved to English labels via one batched `wbgetentities` call in `fetch-data.mjs` — 93/96 repos have at least one, 26 distinct disciplines in this dataset. Both are per-repo classifier output, not manually curated — noted in each table's provenance disclosure.

## Revision — 2026-09-05: per-Vertical accent colour ("light touch")

Each Vertical's 3 pages now carry a distinct accent — the eyebrow label, the active/hover nav tab, and the discipline pills in its repo tables — using the same 5-colour categorical palette already established for the landing-page chart (`--op-vertical-<slug>` custom properties in `global.css`, mirroring `src/lib/vertical-colors.mjs`). Everything else (buttons, body links, card borders, keyword pills) stays on the standard brand blue — a deliberate, narrow deviation from the active theme's own rule that the data-viz palette is graph-canvas-only, chosen over a full per-page reskin. Cross-cutting tooling and the landing page are untouched (no `currentTopicSlug`, so `RepoTable` and the shared header both fall back to the default blue).

New shared component: `VerticalTabs.astro` (eyebrow + Landscape/Community/Health nav with a slot for the page's own `<h1>`) — replaces three near-duplicate header blocks, one per Vertical sub-page.

## Revision — 2026-09-06

- **"A note on coverage" renamed to "Disclaimer"** in `CoverageDisclaimer.astro`.
- **Per-Vertical page background.** Each Vertical's 3 pages now tint the page body toward that Vertical's accent — `--op-vertical-bg-<slug>` in `global.css`, a `color-mix()` of the accent at 7% over `--op-bg` (derived from the existing accent tokens, not a separately hand-picked colour, so it can't drift out of sync). `Layout.astro` takes an optional `accentSlug` prop and sets the body background inline when present; the landing page and Cross-cutting tooling omit it and stay on plain `--op-bg`, confirmed identical via computed style. Cards/tables keep their normal grey surface — only the negative space between them shows the tint, consistent with the earlier "light touch" call.

## Revision — 2026-09-07

- **Backgrounds weren't distinct enough at 7% mix** — replaced the `color-mix()` formula with 5 hand-picked hex values (`--op-vertical-bg-<slug>` in `global.css`): dark navy (Biomedical), dark forest (Environmental), dark amber/brown (Energy), dark maroon (Digital Society), dark violet (Large Infrastructure). Same dark/low-saturation family as `--op-bg`/`--op-surface`, but each clearly separable at a glance — confirmed via screenshot (Energy vs. Digital Society read as obviously different pages now, not "both basically black").
- **Landscape / Community / Health & Activity tabs enlarged**: `VerticalTabs.astro` nav bumped from `text-op-sm` (14px) to `text-op-h4` (18px) with explicit `font-weight: 600` on both active and inactive states (Tailwind's text-size theme keys don't reliably carry a paired font-weight, so it's set directly in the component's scoped `<style>`).

## Scope & audience

- **Scope**: Swiss Data Science Center (SDSC) itself — a lab-cluster dashboard sliced by 5 internal topics: **Biomedical**, **Environmental**, **Energy**, **Digital Society**, **Large Infrastructure**.
- **GitHub orgs**: `sdsc-ordes` (91 repos with usable metadata) + `sdsc-innovation` (5 repos) = 96 repos total. SDSC's ROR record: `ror.org/02hdt9m26`, parent institutions ETH Zurich and EPFL.
- **Primary viewer**: research leadership & funders — vocabulary favours impact/outcomes/coverage over raw technical metrics.
- **Posture**: hybrid — narrative landing page, denser stats one click down in each topic/theme drill-down.
- **Design system**: default SDSC stack — `openpulse-dark-theme` over `sdsc-ui-kit`. No custom design skill needed.
- **Repo-type framing**: Software repos only for v1 (flagged, not silently decided) — non-software artifacts noted in the coverage panel.

## Topic → repo classification (many-to-many)

No existing taxonomy tags repos to these 5 topics — this mapping was hand-classified from repo names/descriptions and confirmed interactively. **A repo can belong to more than one topic** — in particular, "Large Infrastructure" is a project *type* that cuts across the domain topics, not a 5th domain, so several repos carry a domain tag plus Large Infrastructure. It ships as a static lookup table in the snapshot script (`src/data/topic-map.json`, `repo → topics[]`), not derived at build time, since there's no reliable signal to re-derive it from.

| Topic | Repos (unique) | Also cross-tagged into it | Flagship repo |
|---|---|---|---|
| Biomedical | 17 | — | `imaging-plaza` |
| Digital Society | 10 | — | `debates-app` |
| Large Infrastructure | 6 primary (`catplus-*` ×4, `ordfts-hackathon-pneuma-rdi-hub`, `ordfts-hackathon-vehicles-detection`) | + 13 cross-tagged from other topics (see below) = **19 total** | `catplus-converters` |
| Environmental | 6 | — | `digiwild` |
| Energy | 3 | — | `wedowind` |
| **Cross-cutting tooling** (not shown under a topic) | 54 | — | templates, workshops, generic RDF/semantic tooling, the `open-pulse-*` family (this platform itself) |

**Dual-tagged into Large Infrastructure** (explicit "Research Data Infrastructure" wording or equivalent infra function):
- `bedretto-ontology` → Energy + Large Infrastructure
- `wedowind` → Energy + Large Infrastructure
- `saving-willy` → Environmental + Large Infrastructure
- `imaging-plaza`, `imaging-plaza-webapp`, `imaging-plaza-search`, `imaging-plaza-ontology`, `imaging-plaza-fair-indicator-api` → Biomedical + Large Infrastructure
- `nds-lucid-dashboard`, `nds-lucid-graphdb-loader`, `nds-lucid-graphdb-syncer`, `nds-lucid-ingestion`, `nds-lucid-web-app` → Biomedical + Large Infrastructure

Considered and deliberately **not** dual-tagged: `mava-api`/`mava-exchange` (Environmental only — an exchange format alone doesn't match the scale of the explicit RDI projects), `arema-ontology` (Energy only — no description text to justify a second tag), pNEUMA repos (Large Infrastructure only — no separate domain topic assigned).

42 unique repos carry at least one topic tag (55 topic assignments total across them); the remaining 54 repos are cross-cutting tooling — real SDSC output but not shown under a topic page, only in the org-wide catalogue and coverage panel.

## Themes (per topic, ×5)

Each topic gets its own **Landscape / Community / Health & Activity** set (Research Impact dropped from v1 — see caveat below). Plus two fixed cross-topic elements.

| Page | Question it answers | Headline metric | Data source |
|---|---|---|---|
| **Landing** (required) | What is SDSC's project portfolio, at a glance? | 5–6 headline numbers (total repos, contributors, 5 topic tiles, 5-yr commit trend) + signature visual (stacked commit-growth chart by topic) | snapshot (`summary.json`) |
| **Topic → Landscape** ×5 | What exists in this topic? | Repo count, languages, licenses | `op-collections`/SPARQL (catalogue) |
| **Topic → Community** ×5 | Who's behind it? | Contributors by institution (affiliation-based partner network — see below), SDSC org split (`sdsc-ordes` vs `sdsc-innovation`) | Neo4j `AFFILIATED_WITH`, `CONTRIBUTES_TO`, `MEMBER_OF` |
| **Topic → Health & Activity** ×5 | How alive and healthy is it? | 5-year commit trend (fork-history excluded) **+ a "last 3 months" activity ranking** — projects ranked most→least active by commits in the trailing 90 days, zero-activity projects excluded from the ranking entirely | OpenSearch (commits), `query-chaoss` |
| **Coverage panel** (required, fixed) | What's missing? | Actionable to-do list of metadata gaps | `coverage.json` |

**3-month activity ranking — confirmed real but sparse.** Only 17 of 96 repos had any commit in the trailing 90 days as of this recon. Per topic:

| Topic | Active (last 90 days), ranked | 
|---|---|
| Biomedical | `modos-api` (62) > `deid-module` (33) > `imaging-plaza-webapp` (25) > `imaging-plaza` (1) |
| Environmental | `mava-exchange` (60) |
| Energy | `wedowind` (25) |
| Digital Society | *none* — renders as "no active projects this quarter", not an empty chart |
| Large Infrastructure | *none* — same treatment |

This ranking is necessarily a live number, not a fixed one — it will look different (and should) every time the snapshot is rebuilt, since it's a trailing 90-day window from the build timestamp.

**Research Impact is dropped from v1**, not reframed — direct `schema:citation` links from SDSC repos to publications are zero across all 5 topics today (a real gap, not a query bug: SPARQL's own docs note software→publication links are sparse until contributor ORCID linkage grows). Revisit once ORCID coverage improves.

**Partner projects**: built from **contributor institutional affiliation** (Neo4j `AFFILIATED_WITH` → `RorOrg`), not the raw dependency/fork graph — `DEPENDS_ON` mostly surfaces generic PyPI packages (flask, fastapi, pydantic…) and `FORK_OF` surfaces unrelated upstream OSS projects (TopQuadrant, GA4GH, CHAOSS…), neither of which reads as a "research partner." Confirmed institutional signal today: EPFL (9 people), SDSC (8), ETH Zurich (3), UNIL (2), UNIGE (2), plus smaller counts (Institut Pasteur, Wageningen, RWTH Aachen…). The GitHub org `swiss` (govtech, 18 shared repos via `oss-catalog`/`publiccode-editor`) is the one genuine cross-repo partner link found and will be surfaced explicitly.

## Data reconnaissance (findings)

| Check | Result |
|---|---|
| Connectivity (Stage 0) | All 5 stores reachable: Neo4j 3.85M nodes, OpenSearch 2.56M commit docs, SPARQL populated, CHAOSS API up, hub up |
| Neo4j scope resolution | 96 repos across `sdsc-ordes` + `sdsc-innovation`, confirmed consistent with op-collections `github_repos` |
| Commit coverage per topic | Biomedical 2,797 · Digital Society 2,186 · Large Infrastructure 1,405 · Environmental 1,119 · Energy 609 commits — all non-zero, Energy thinnest |
| 5-year trend | 2021: 306 → 2025: 6,640 commits/yr (whole-org) — strong growth story for the landing visual |
| Fork inflation | `shacl`, `skohub-vocabs`, `refget-cloud`, `tibava`, `oss-catalog`, `publiccode-editor`, `odtp-component-client`, `open-pulse-grimoirelab` are `FORK_OF` upstream projects — their raw commit history goes back to 2011 and must be excluded from activity series |
| CHAOSS | Spot-checked `sdsc-ordes/imaging-plaza` — 35 metrics compute cleanly (contributors: 2, license: AGPL-3.0 declared) |
| SPARQL / publications | Zero `schema:citation` links from any SDSC repo → Impact theme dropped |
| Partner signal | Affiliation-based (see above) is clean; dependency/fork-graph signal is noisy and excluded |

## Stack & publishing

- **Framework**: Astro — static-first by default, minimal JS, suits ~16+ routes (landing + 5 topics × 3 themes + coverage) with islands for D3 charts.
- **Publishing**: static, GitHub Pages. `scripts/fetch-data.mjs` queries Neo4j/OpenSearch/SPARQL/CHAOSS at build time (same transports as the `query-*` skills) and writes:
  - `summary.json` — landing headline numbers
  - `topic-map.json` — the hand-classified repo→topics[] lookup table (many-to-many, static, not re-derived)
  - `repos.json` — catalogue rows per topic
  - `health.json` — 5-year commit series per topic (fork-history excluded) + a `recentActivity` block (trailing-90-day commit ranking per topic, zero-activity repos omitted) + CHAOSS block
  - `partners.json` — affiliation-based institution network + the `swiss` org link
  - `coverage.json` — gap list (Impact theme, cross-cutting-tooling repos, thin Energy topic, etc.)
- No server runtime; credentials stay at build time only.

## Open framing calls (deliberately not resolved here)

- The 54 cross-cutting tooling repos (templates, workshops, `open-pulse-*` itself) are excluded from all 5 topic pages by design — they still count in the org-wide totals and coverage panel. Revisit if SDSC wants a 6th "Platform & Tooling" bucket.
- A handful of topic assignments were judgment calls with no ground truth (`arema-ontology` → Energy, `digiplant` → Environmental, `ordfts-hackathon-vehicles-detection` → Large Infrastructure, `osm-geotiff` → Environmental) — flagged in `topic-map.json` for SDSC to correct if wrong.
- `mava-api`/`mava-exchange` and `arema-ontology` were considered for a Large Infrastructure dual-tag and deliberately left single-topic — revisit if SDSC considers them part of that program.
- Energy has only 3 repos — its Community/Health pages will visibly look thinner than the other 4 topics. Not padded artificially.
- The 3-month activity ranking is a live, rebuild-dependent number by nature — Digital Society and Large Infrastructure show zero active projects as of this recon; that's expected to fluctuate and should read as "quiet this quarter," not as a broken widget.
