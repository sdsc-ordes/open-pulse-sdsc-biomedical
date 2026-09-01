// Categorical colour per Vertical — drawn from the openpulse-dark-theme
// data-viz palette (§2.6) so it stays on-brand without inventing new hues.
// Plain .mjs (not .ts) so the build-time snapshot script can import it
// directly alongside the Vite/Astro app — frontend-dev §5's "one colour
// module" rule, shared across both runtimes instead of duplicated.
export const VERTICAL_COLORS = {
	biomedical: '#60a5fa',
	environmental: '#4ade80',
	energy: '#fbbf24',
	'digital-society': '#f472b6',
	'large-infrastructure': '#a78bfa'
};
