// Shared shapes for the data snapshots baked by scripts/fetch-data.mjs into
// src/data/*.json — source of truth for every page that reads them
// (frontend-dev §9).
//
// Internal identifiers still say "topic" (TopicSlug, TOPIC_MAP, /topics/
// routes) — only user-facing copy renders the term "Vertical". Renaming the
// internals was judged not worth the churn; see DASHBOARD.md.

export type TopicSlug = 'biomedical' | 'environmental' | 'energy' | 'digital-society' | 'large-infrastructure';

export interface Topic {
	slug: TopicSlug;
	label: string;
}

export interface Repo {
	owner: string;
	name: string;
	url: string;
	description: string | null;
	language: string | null;
	license: string | null;
	stars: number;
	contributorsCount: number;
	isFork: boolean;
	forkOf: string | null;
	createdAt: string | null;
	pushedAt: string | null;
	lastCommit: string | null;
	keywords: string[];
	disciplines: string[];
	topics: TopicSlug[];
	topicUncertain: boolean;
}

export interface ReposSnapshot {
	fetchedAt: string;
	repos: Repo[];
}

export interface YearCommits {
	year: string;
	commits: number;
}

export interface ActiveRepo {
	repo: string;
	commits: number;
}

export interface ChaossMetric {
	slug: string;
	name: string;
	category: string;
	chaoss_topic: string;
	question: string;
	description: string;
	chaoss_url: string;
	is_time_based: boolean;
	value: string;
	label: string;
	secondary: string | null;
	unification?: string | null;
	notes?: string | null;
	examples?: Record<string, string>[];
}

export interface TopicHealth {
	repoCount: number;
	nonForkRepoCount: number;
	fiveYearSeries: YearCommits[];
	last90Days: ActiveRepo[];
}

export interface HealthSnapshot {
	fetchedAt: string;
	topics: Record<TopicSlug, TopicHealth>;
}

/** chaoss.json — CHAOSS metrics for every repo, keyed by "owner/name". A
 * repo's value is `null` when the API call failed for it. */
export interface ChaossSnapshot {
	fetchedAt: string;
	availableSlugs: string[];
	byRepo: Record<string, ChaossMetric[] | null>;
}

export interface Institution {
	institution: string;
	people: number;
}

export interface PartnersSnapshot {
	fetchedAt: string;
	totalContributors: number;
	orgSplit: { owner: string; repos: number }[];
	institutions: Institution[];
	swissGovtechPartner: { org: string; repos: string[] };
}

export interface RepoCountYear {
	year: string;
	repos: number;
}

export interface TopicSummary {
	slug: TopicSlug;
	label: string;
	color: string;
	repoCount: number;
	fiveYearCommits: number;
	fiveYearSeries: YearCommits[];
	repoGrowthSeries: RepoCountYear[];
}

export interface SummarySnapshot {
	fetchedAt: string;
	totalRepos: number;
	totalNonForkRepos: number;
	totalContributors: number;
	crossCuttingCount: number;
	orgSplit: { owner: string; repos: number }[];
	topics: TopicSummary[];
}

export interface TopicMapSnapshot {
	fetchedAt: string;
	method: string;
	topics: Topic[];
	map: Record<string, TopicSlug[]>;
	uncertain: string[];
}
