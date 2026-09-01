#!/usr/bin/env node
// Build-time data snapshot for the SDSC Projects Dashboard.
//
// Queries Neo4j, OpenSearch, the op-collections hub, and the CHAOSS metrics
// API directly (same .env + HTTP transports as the query-* skill scripts)
// and writes typed JSON into src/data/. The browser never touches the
// Open Pulse stores — see CLAUDE.md "Architecture".
//
// Run: node scripts/fetch-data.mjs

import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERTICAL_COLORS } from '../src/lib/vertical-colors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'data');
const ORGS = ['sdsc-ordes', 'sdsc-innovation'];

// ── env ──────────────────────────────────────────────────────────────────

async function loadDotenv() {
	for (let dir of [process.cwd(), __dirname]) {
		for (let i = 0; i < 10; i++) {
			const envPath = join(dir, '.env');
			try {
				await stat(envPath);
				const text = await readFile(envPath, 'utf8');
				for (const line of text.split('\n')) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
					const idx = trimmed.indexOf('=');
					const key = trimmed.slice(0, idx).trim();
					const value = trimmed.slice(idx + 1).trim();
					if (process.env[key] === undefined) process.env[key] = value;
				}
				return;
			} catch {
				const parent = dirname(dir);
				if (parent === dir) break;
				dir = parent;
			}
		}
	}
}

let ENDPOINT, TOKEN;

function authHeader() {
	return `Basic ${TOKEN}`;
}

async function neo4j(query) {
	const res = await fetch(`${ENDPOINT}/api/databases/cypher/query`, {
		method: 'POST',
		headers: { Authorization: authHeader(), 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ query })
	});
	if (!res.ok) throw new Error(`neo4j ${res.status}: ${await res.text()}`);
	const payload = await res.json();
	return payload.rows.map((r) => Object.fromEntries(payload.columns.map((c, i) => [c, r[i]])));
}

async function openSearchDSL(index, body) {
	const res = await fetch(`${ENDPOINT}/api/databases/opensearch/query`, {
		method: 'POST',
		headers: { Authorization: authHeader(), 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ mode: 'dsl', query: { index, ...body } })
	});
	if (!res.ok) throw new Error(`opensearch ${res.status}: ${await res.text()}`);
	return res.json();
}

async function collections(path, params = {}) {
	const url = new URL(`${ENDPOINT}${path}`);
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
	const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: 'application/json' } });
	if (!res.ok) throw new Error(`collections ${res.status}: ${await res.text()}`);
	return res.json();
}

async function chaoss(path) {
	const res = await fetch(`${ENDPOINT}${path}`, { headers: { Authorization: authHeader(), Accept: 'application/json' } });
	if (!res.ok) throw new Error(`chaoss ${res.status}: ${await res.text()}`);
	return res.json();
}

// ── static classification (no reliable signal to re-derive this from) ─────
// Hand-classified from repo names/descriptions, confirmed interactively with
// SDSC (see DASHBOARD.md "Topic → repo classification"). A repo can carry
// more than one topic — "Large Infrastructure" is a project *type* that cuts
// across the domain topics, not a 5th domain.

export const TOPICS = [
	{ slug: 'biomedical', label: 'Biomedical' },
	{ slug: 'environmental', label: 'Environmental' },
	{ slug: 'energy', label: 'Energy' },
	{ slug: 'digital-society', label: 'Digital Society' },
	{ slug: 'large-infrastructure', label: 'Large Infrastructure' }
];

export const TOPIC_MAP = {
	'deid-module': ['biomedical'],
	'demo-biomedit-workflow': ['biomedical'],
	'didc-pdf-parser': ['biomedical'],
	'imaging-plaza': ['biomedical', 'large-infrastructure'],
	'imaging-plaza-fair-indicator-api': ['biomedical', 'large-infrastructure'],
	'imaging-plaza-ontology': ['biomedical', 'large-infrastructure'],
	'imaging-plaza-search': ['biomedical', 'large-infrastructure'],
	'imaging-plaza-webapp': ['biomedical', 'large-infrastructure'],
	'modos-api': ['biomedical'],
	'modos-poster': ['biomedical'],
	'modos-schema': ['biomedical'],
	'nds-lucid-dashboard': ['biomedical', 'large-infrastructure'],
	'nds-lucid-graphdb-loader': ['biomedical', 'large-infrastructure'],
	'nds-lucid-graphdb-syncer': ['biomedical', 'large-infrastructure'],
	'nds-lucid-ingestion': ['biomedical', 'large-infrastructure'],
	'nds-lucid-web-app': ['biomedical', 'large-infrastructure'],
	'refget-cloud': ['biomedical'],

	digiwild: ['environmental'],
	'mava-api': ['environmental'],
	'mava-exchange': ['environmental'],
	'saving-willy': ['environmental', 'large-infrastructure'],
	'osm-geotiff': ['environmental'],
	digiplant: ['environmental'],

	'bedretto-ontology': ['energy', 'large-infrastructure'],
	wedowind: ['energy', 'large-infrastructure'],
	'arema-ontology': ['energy'],

	'debates-analytics': ['digital-society'],
	'debates-app': ['digital-society'],
	'debates-solr': ['digital-society'],
	'debates-ui': ['digital-society'],
	'dt-political-debates': ['digital-society'],
	'oss-catalog': ['digital-society'],
	'publiccode-editor': ['digital-society'],
	'govtech-hackathon-publiccode.yml': ['digital-society'],
	'odtp-unog-digitalrecordings-scrapper': ['digital-society'],
	pxRRead: ['digital-society'],

	'catplus-chembord': ['large-infrastructure'],
	'catplus-converters': ['large-infrastructure'],
	'catplus-docs': ['large-infrastructure'],
	'catplus-ontology': ['large-infrastructure'],
	'ordfts-hackathon-pneuma-rdi-hub': ['large-infrastructure'],
	'ordfts-hackathon-vehicles-detection': ['large-infrastructure']
};

// Repos with judgment-call classifications (no ground truth) — surfaced in
// coverage.json rather than presented as certain.
const UNCERTAIN = ['arema-ontology', 'digiplant', 'ordfts-hackathon-vehicles-detection', 'osm-geotiff'];

function repoWildcards(owner, name) {
	const esc = name.replace(/[.]/g, '?');
	return [{ wildcard: { repo_name: `*${owner}/${esc}` } }, { wildcard: { repo_name: `*${owner}/${esc}.git` } }];
}

function log(...args) {
	console.log('[fetch-data]', ...args);
}

async function main() {
	await loadDotenv();
	ENDPOINT = (process.env.OPENPULSE_ENDPOINT || '').replace(/\/$/, '');
	const auth = process.env.OPENPULSE_AUTH;
	if (!ENDPOINT || !auth || !auth.includes('/')) {
		console.error('error: OPENPULSE_ENDPOINT and OPENPULSE_AUTH (user/password) must be set in .env');
		process.exit(2);
	}
	const [user, ...passwordParts] = auth.split('/');
	TOKEN = Buffer.from(`${user}:${passwordParts.join('/')}`).toString('base64');

	const fetchedAt = new Date().toISOString();
	await mkdir(OUT_DIR, { recursive: true });

	// ── 1. Repo catalogue (op-collections github_repos) ──────────────────
	log('fetching repo catalogue…');
	const rawRepos = [];
	for (const owner of ORGS) {
		const page = await collections('/api/hub/c/github_repos/rows', { q: owner, size: 150 });
		for (const row of page.rows) if (row.owner === owner) rawRepos.push(row);
	}
	log(`  ${rawRepos.length} repos across ${ORGS.join(', ')}`);

	// Fork lineage, from the graph (op-collections is_fork flags the repo but
	// not its upstream target).
	const orgsLiteral = JSON.stringify(ORGS);
	const forkRows = await neo4j(
		`MATCH (r:Repo)-[:FORK_OF]->(p:Repo) WHERE r.owner IN ${orgsLiteral} RETURN r.name AS repo, p.full_name AS upstream`
	);
	const forkUpstream = Object.fromEntries(forkRows.map((r) => [r.repo, r.upstream]));

	const repos = rawRepos.map((r) => {
		const topics = TOPIC_MAP[r.name] || [];
		let contributorsCount = 0;
		try {
			const list = JSON.parse(r.contributors || '[]');
			contributorsCount = Array.isArray(list) ? list.length : 0;
		} catch {
			contributorsCount = 0;
		}
		return {
			owner: r.owner,
			name: r.name,
			url: `https://github.com/${r.owner}/${r.name}`,
			description: r.description || null,
			language: r.primary_language || null,
			license: r.license_spdx || null,
			stars: r.stargazers_count ?? 0,
			contributorsCount,
			isFork: !!r.is_fork || Boolean(forkUpstream[r.name]),
			forkOf: forkUpstream[r.name] || null,
			createdAt: r.created_at || null,
			pushedAt: r.pushed_at || null,
			lastCommit: null, // filled in below from OpenSearch, once we have the full repo list
			topics,
			topicUncertain: UNCERTAIN.includes(r.name)
		};
	});
	const nonForkRepos = repos.filter((r) => !r.isFork);
	log(`  ${repos.filter((r) => r.isFork).length} forks excluded from activity series (kept, badged, in catalogue)`);

	// Last-commit date per repo, one bulk OpenSearch query for the whole org
	// (terms + max sub-agg) rather than 96 individual round-trips.
	log('fetching last-commit dates…');
	{
		const should = repos.flatMap((r) => repoWildcards(r.owner, r.name));
		const body = {
			size: 0,
			query: { bool: { should, minimum_should_match: 1 } },
			aggs: { repos: { terms: { field: 'repo_name', size: 300 }, aggs: { last: { max: { field: 'commit_date' } } } } }
		};
		const res = await openSearchDSL('git_demo_enriched', body);
		const buckets = res?.raw?.aggregations?.repos?.buckets ?? [];
		const lastByRepo = new Map();
		for (const b of buckets) {
			const m = /github\.com\/([^/]+)\/(.+?)(\.git)?$/i.exec(b.key);
			if (!m || !b.last?.value_as_string) continue;
			const key = `${m[1]}/${m[2]}`;
			const existing = lastByRepo.get(key);
			if (!existing || b.last.value_as_string > existing) lastByRepo.set(key, b.last.value_as_string);
		}
		for (const r of repos) r.lastCommit = lastByRepo.get(`${r.owner}/${r.name}`) || null;
		log(`  last-commit date found for ${[...lastByRepo.keys()].length}/${repos.length} repos`);
	}

	await writeFile(join(OUT_DIR, 'repos.json'), JSON.stringify({ fetchedAt, repos }, null, 2));
	log(`wrote repos.json (${repos.length} rows)`);

	await writeFile(
		join(OUT_DIR, 'topic-map.json'),
		JSON.stringify(
			{ fetchedAt, method: 'hand-classified, confirmed interactively — see DASHBOARD.md', topics: TOPICS, map: TOPIC_MAP, uncertain: UNCERTAIN },
			null,
			2
		)
	);
	log('wrote topic-map.json');

	// ── 2. Contributors & institutional affiliation (Neo4j) ──────────────
	log('fetching contributor + affiliation data…');
	const totalContributors = await neo4j(
		`MATCH (u:User)-[:CONTRIBUTES_TO]->(r:Repo) WHERE r.owner IN ${orgsLiteral} RETURN count(DISTINCT u) AS n`
	);
	const affiliations = await neo4j(
		`MATCH (u:User)-[:CONTRIBUTES_TO]->(r:Repo) WHERE r.owner IN ${orgsLiteral}
		 MATCH (u)-[:AFFILIATED_WITH]->(o:RorOrg)
		 RETURN o.name AS institution, count(DISTINCT u) AS people
		 ORDER BY people DESC`
	);
	const swissPartner = await neo4j(
		`MATCH (u:User)-[:CONTRIBUTES_TO]->(r:Repo) WHERE r.owner IN ${orgsLiteral}
		 MATCH (u)-[:CONTRIBUTES_TO]->(other:Repo) WHERE other.owner = 'swiss'
		 RETURN DISTINCT other.full_name AS repo, other.name AS name`
	);
	const orgSplit = ORGS.map((owner) => ({ owner, repos: repos.filter((r) => r.owner === owner).length }));

	await writeFile(
		join(OUT_DIR, 'partners.json'),
		JSON.stringify(
			{
				fetchedAt,
				totalContributors: totalContributors[0]?.n ?? 0,
				orgSplit,
				institutions: affiliations,
				swissGovtechPartner: { org: 'swiss', repos: swissPartner.map((r) => r.name) }
			},
			null,
			2
		)
	);
	log(`wrote partners.json (${affiliations.length} institutions, ${swissPartner.length} shared swiss-org repos)`);

	// ── 3. Commit activity (OpenSearch) — 5-year series + 90-day ranking ─
	log('fetching commit activity…');
	async function yearlySeries(repoList) {
		if (!repoList.length) return [];
		const should = repoList.flatMap((r) => repoWildcards(r.owner, r.name));
		const body = {
			size: 0,
			query: { bool: { should, minimum_should_match: 1 } },
			aggs: {
				by_year: {
					date_histogram: {
						field: 'commit_date',
						calendar_interval: 'year',
						format: 'yyyy',
						min_doc_count: 0,
						extended_bounds: { min: 'now-5y/y', max: 'now/y' }
					}
				}
			}
		};
		const res = await openSearchDSL('git_demo_enriched', body);
		const buckets = res?.raw?.aggregations?.by_year?.buckets ?? [];
		return buckets.map((b) => ({ year: b.key_as_string, commits: b.doc_count }));
	}

	async function recentActivity(repoList) {
		if (!repoList.length) return [];
		const should = repoList.flatMap((r) => repoWildcards(r.owner, r.name));
		const body = {
			size: 0,
			query: { bool: { must: [{ range: { commit_date: { gte: 'now-90d' } } }], should, minimum_should_match: 1 } },
			aggs: { repos: { terms: { field: 'repo_name', size: 200, order: { _count: 'desc' } } } }
		};
		const res = await openSearchDSL('git_demo_enriched', body);
		const buckets = res?.raw?.aggregations?.repos?.buckets ?? [];
		const byRepo = new Map();
		for (const b of buckets) {
			const m = /github\.com\/([^/]+)\/(.+?)(\.git)?$/i.exec(b.key);
			if (!m) continue;
			const key = `${m[1]}/${m[2]}`;
			byRepo.set(key, (byRepo.get(key) || 0) + b.doc_count);
		}
		return [...byRepo.entries()].map(([repo, commits]) => ({ repo, commits })).sort((a, b) => b.commits - a.commits);
	}

	const health = {};
	for (const topic of TOPICS) {
		const topicRepos = nonForkRepos.filter((r) => r.topics.includes(topic.slug));
		const [series, active] = await Promise.all([yearlySeries(topicRepos), recentActivity(topicRepos)]);
		health[topic.slug] = {
			repoCount: repos.filter((r) => r.topics.includes(topic.slug)).length,
			nonForkRepoCount: topicRepos.length,
			fiveYearSeries: series,
			last90Days: active
		};
		log(`  ${topic.slug}: ${series.reduce((s, y) => s + y.commits, 0)} commits (5yr), ${active.length} repos active last 90 days`);
	}

	await writeFile(join(OUT_DIR, 'health.json'), JSON.stringify({ fetchedAt, topics: health }, null, 2));
	log('wrote health.json');

	// ── 4. CHAOSS metrics — every repo, not just a flagship ───────────────
	// Powers the per-vertical "Project Viability Starter" metric explorer,
	// which lets a reader toggle projects on/off. Windowed to the trailing
	// 365 days (365 is one of the API's exact snap buckets — no rounding).
	log(`fetching CHAOSS metrics for all ${repos.length} repos, 365-day window (this takes a while)…`);
	const chaossByRepo = {};
	let chaossOk = 0;
	for (const r of repos) {
		const key = `${r.owner}/${r.name}`;
		try {
			const data = await chaoss(`/api/v1/metrics/chaoss/repositories/github.com/${r.owner}/${r.name}/metrics?window=365`);
			chaossByRepo[key] = data.metrics || data;
			chaossOk++;
		} catch (e) {
			chaossByRepo[key] = null;
		}
	}
	log(`  CHAOSS metrics fetched for ${chaossOk}/${repos.length} repos`);

	// The catalogue of metric slugs Open Pulse actually computes — derived
	// from the first successful response, since the API returns the same
	// 35-metric shape for every repo (values differ, the slug set doesn't).
	const availableSlugs = new Set(Object.values(chaossByRepo).find(Boolean)?.map((m) => m.slug) ?? []);

	await writeFile(
		join(OUT_DIR, 'chaoss.json'),
		JSON.stringify({ fetchedAt, availableSlugs: [...availableSlugs], byRepo: chaossByRepo }, null, 2)
	);
	log(`wrote chaoss.json (${availableSlugs.size} metric slugs available)`);

	// ── 5. Summary (landing headline numbers) ─────────────────────────
	// "Five years of growth" on the landing page is repo-count growth
	// (ecosystem growth), not commit volume — that cut lives on each
	// Vertical's own Health & Activity page instead. Cumulative count of
	// non-fork repos, by createdAt, per calendar year.
	const thisYear = new Date().getUTCFullYear();
	const growthYears = Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i));
	function repoGrowthSeries(repoList) {
		return growthYears.map((year) => ({
			year,
			repos: repoList.filter((r) => r.createdAt && r.createdAt.slice(0, 4) <= year).length
		}));
	}

	const crossCuttingCount = repos.filter((r) => r.topics.length === 0).length;
	const summary = {
		fetchedAt,
		totalRepos: repos.length,
		totalNonForkRepos: nonForkRepos.length,
		totalContributors: totalContributors[0]?.n ?? 0,
		crossCuttingCount,
		orgSplit,
		topics: TOPICS.map((t) => {
			const topicNonForkRepos = nonForkRepos.filter((r) => r.topics.includes(t.slug));
			return {
				slug: t.slug,
				label: t.label,
				color: VERTICAL_COLORS[t.slug],
				repoCount: repos.filter((r) => r.topics.includes(t.slug)).length,
				fiveYearCommits: health[t.slug].fiveYearSeries.reduce((s, y) => s + y.commits, 0),
				fiveYearSeries: health[t.slug].fiveYearSeries,
				repoGrowthSeries: repoGrowthSeries(topicNonForkRepos)
			};
		})
	};
	await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
	log('wrote summary.json');

	log('done.');
}

main().catch((e) => {
	console.error('[fetch-data] fatal:', e);
	process.exit(1);
});
