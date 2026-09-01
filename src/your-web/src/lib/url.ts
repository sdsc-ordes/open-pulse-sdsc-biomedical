// GitHub Pages serves this app from a project subpath
// (https://sdsc-ordes.github.io/open-pulse-sdsc-biomedical/), not the
// domain root — Astro's `base` config (astro.config.mjs) handles bundled
// assets automatically, but hand-written internal links and public/ file
// references need the prefix added explicitly. Always call this for an
// internal absolute path — never write a bare `href="/..."` or `href={`/...`}`.
export function url(path: string): string {
	const base = import.meta.env.BASE_URL; // e.g. '/' locally, '/open-pulse-sdsc-biomedical/' on Pages
	return base.replace(/\/$/, '') + path;
}
