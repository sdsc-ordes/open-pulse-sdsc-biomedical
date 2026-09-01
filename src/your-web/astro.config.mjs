// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Injected at build time, never computed in the browser (frontend-dev §6).
const BUILD_TIMESTAMP = new Date().toISOString();

// https://astro.build/config
export default defineConfig({
	site: 'https://sdsc-ordes.github.io',
	vite: {
		plugins: [tailwindcss()],
		define: {
			__BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP)
		}
	}
});
