// CHAOSS metrics shown on a Vertical / cross-cutting-tooling page. All
// windowed metrics use a 365-day window (see scripts/fetch-data.mjs).
//
// Two kinds of section:
// - CHAOSS_MODELS: an official chaoss.community metrics *model* — every
//   metric it lists, exact-name matched against the Open Pulse CHAOSS API's
//   35-metric catalogue. A close-but-not-identical Open Pulse metric is
//   still marked missing rather than silently substituted.
// - EXTRA_METRICS: a curated list of individually useful CHAOSS metrics
//   (not one official "model"), same exact-name-or-missing rule.
//
// Every metric name links to its real chaoss.community definition page —
// verified live, not guessed from the URL pattern — whether or not Open
// Pulse currently computes it.
//
// Sources (fetched 2026-08-31 / 2026-09-01):
// - https://www.chaoss.community/kb/metrics-model-project-viability-starter/
// - individual https://chaoss.community/kb/metric-*/ pages

export interface ModelMetric {
	name: string;
	slug: string | null;
	/** Explicit CHAOSS definition URL — always set, even when `slug` is
	 * null, so the reference stays clickable regardless of data availability. */
	chaossUrl: string;
	/** Set when the closest Open Pulse metric doesn't share this exact name
	 * (e.g. the model asks for "Change Request Review Duration" and the
	 * closest thing Open Pulse computes is "Change Request Duration"). */
	approximation?: string;
}

export interface ChaossModel {
	title: string;
	url: string;
	description: string;
	metrics: ModelMetric[];
}

export const CHAOSS_MODELS: ChaossModel[] = [
	{
		title: 'OSS Project Viability Starter',
		url: 'https://www.chaoss.community/kb/metrics-model-project-viability-starter/',
		description:
			'Evaluates open source project viability across compliance, security, governance, and community engagement — a dependency-risk lens. Shown over the trailing 365 days.',
		metrics: [
			{ name: 'Contributor Absence Factor', slug: 'absence_factor', chaossUrl: 'https://chaoss.community/kb/metric-contributor-absence-factor/' },
			{ name: 'Elephant Factor', slug: null, chaossUrl: 'https://chaoss.community/kb/metric-elephant-factor/' },
			{ name: 'Change Requests', slug: null, chaossUrl: 'https://chaoss.community/kb/metric-change-requests/' },
			{ name: 'Change Request Closure Ratio', slug: 'closure_ratio', chaossUrl: 'https://chaoss.community/kb/metric-change-request-closure-ratio/' },
			{ name: 'Libyears', slug: null, chaossUrl: 'https://chaoss.community/kb/metric-libyears/' },
			{ name: 'OSI Approved Licenses', slug: null, chaossUrl: 'https://chaoss.community/kb/metric-osi-approved-licenses/' }
		]
	}
];

/** Individually curated, requested one-by-one rather than pulled from a
 * single chaoss.community model.
 *
 * Dropped from the original request, per feedback:
 * - Issue Age — no matching Open Pulse metric at all (removed rather than
 *   left as a permanent "Under works").
 * - Issues Active / Issues Closed — real Open Pulse metrics, but every
 *   active repo returns 0 in the 365-day window (verified against
 *   chaoss.json), so the card was pure "not enough info" noise.
 * Upstream Code Dependencies moved out of this list — it gets its own
 * full-width widget (UpstreamDependenciesCard.astro) that lists the actual
 * dependency names, not just a count. */
export const EXTRA_METRICS: ModelMetric[] = [
	{ name: 'Code Review Count', slug: 'cr_reviews', chaossUrl: 'https://chaoss.community/kb/metric-change-request-reviews/' },
	{ name: 'Self Merge Rate', slug: 'self_merge', chaossUrl: 'https://chaoss.community/kb/metric-self-merge-rate/' },
	{ name: 'Change Request Duration', slug: 'cr_duration', chaossUrl: 'https://chaoss.community/kb/metric-change-request-duration/' },
	{ name: 'Code Changes Lines', slug: 'code_lines', chaossUrl: 'https://chaoss.community/kb/metric-code-changes-lines/' }
];

/** Project Velocity is a composite CHAOSS metric (issues closed + review
 * count + code changes + committer count, per the model's own scatter-plot
 * example — https://chaoss.community/kb/metric-project-velocity/), not a
 * single Open Pulse slug. Built from four slugs Open Pulse does compute. */
export const PROJECT_VELOCITY = {
	name: 'Project Velocity',
	chaossUrl: 'https://chaoss.community/kb/metric-project-velocity/',
	xSlug: 'code_lines' as const,
	xLabel: 'Code changes (lines, log scale)',
	ySlugs: ['issues_closed', 'cr_reviews'] as const,
	yLabel: 'Issues closed + reviews (log scale)',
	sizeSlug: 'committers' as const,
	sizeLabel: 'Committers'
};
