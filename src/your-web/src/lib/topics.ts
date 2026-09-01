import topicMapData from '../data/topic-map.json';
import reposData from '../data/repos.json';
import healthData from '../data/health.json';
import partnersData from '../data/partners.json';
import chaossData from '../data/chaoss.json';
import { VERTICAL_COLORS } from './vertical-colors.mjs';
import type { TopicMapSnapshot, ReposSnapshot, HealthSnapshot, PartnersSnapshot, ChaossSnapshot, TopicSlug } from './types';

export const topicMap = topicMapData as TopicMapSnapshot;
export const reposSnapshot = reposData as ReposSnapshot;
export const healthSnapshot = healthData as HealthSnapshot;
export const partnersSnapshot = partnersData as PartnersSnapshot;
export const chaossSnapshot = chaossData as unknown as ChaossSnapshot;
export const verticalColors: Record<string, string> = VERTICAL_COLORS;

export function getStaticTopicPaths() {
	return topicMap.topics.map((t) => ({ params: { topic: t.slug } }));
}

export function getTopic(slug: string) {
	const topic = topicMap.topics.find((t) => t.slug === slug);
	if (!topic) throw new Error(`Unknown topic slug: ${slug}`);
	return topic;
}

export function getTopicRepos(slug: TopicSlug) {
	return reposSnapshot.repos.filter((r) => r.topics.includes(slug));
}

/** Repos that don't carry any Vertical tag — real SDSC output, just not
 * scoped to one of the five verticals (templates, workshops, generic
 * tooling, the open-pulse-* family). */
export function getCrossCuttingRepos() {
	return reposSnapshot.repos.filter((r) => r.topics.length === 0);
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Active = a commit in the trailing 365 days. Dormant/no commit data at
 * all falls into the Archive bucket rather than being hidden. */
export function splitActiveArchive<T extends { lastCommit: string | null }>(repos: T[]) {
	const cutoff = Date.now() - ONE_YEAR_MS;
	const active: T[] = [];
	const archive: T[] = [];
	for (const r of repos) {
		if (r.lastCommit && new Date(r.lastCommit).getTime() >= cutoff) active.push(r);
		else archive.push(r);
	}
	return { active, archive };
}

export function getRepoMetric(ownerSlashName: string, slug: string) {
	const metrics = chaossSnapshot.byRepo[ownerSlashName];
	return metrics?.find((m) => m.slug === slug) ?? null;
}

/** A metric's description/method/notes/reference are identical across every
 * repo (only value/label differ) — pull one sample from anywhere in the
 * dataset to populate a metric's info popover even if every project *in this
 * particular section* happens to lack data for it. */
export function getMetricInfo(slug: string) {
	for (const metrics of Object.values(chaossSnapshot.byRepo)) {
		const m = metrics?.find((x) => x.slug === slug);
		if (m) return m;
	}
	return null;
}
