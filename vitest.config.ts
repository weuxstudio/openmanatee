import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

/**
 * Test setup for the logic modules.
 *
 * `sitzung.svelte.ts` uses Svelte 5 runes, so the Svelte plugin has to compile
 * it. The browser condition lets the svelte package resolve its client build,
 * which is the one the app runs in.
 */
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		// The verbose reporter names every checked case in the run output.
		reporters: ['verbose']
	}
});
