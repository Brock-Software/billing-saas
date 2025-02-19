import { vitePlugin as remix } from '@remix-run/dev'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { flatRoutes } from 'remix-flat-routes'
import { defineConfig } from 'vite'
import envOnly from 'vite-env-only'

const MODE = process.env.NODE_ENV

export default defineConfig({
	optimizeDeps: { exclude: ['farmhash'] },
	build: {
		cssMinify: MODE === 'production',
		rollupOptions: {
			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
		},
		sourcemap: true,
	},
	plugins: [
		envOnly(),
		remix({
			ignoredRouteFiles: ['**/*'],
			serverModuleFormat: 'esm',
			routes: async defineRoutes => {
				return flatRoutes('routes', defineRoutes, {
					ignoredRouteFiles: [
						'.*',
						'**/*.css',
						'**/*.test.{js,jsx,ts,tsx}',
						'**/__*.*',
						// This is for server-side utilities you want to colocate next to
						// your routes without making an additional directory.
						// If you need a route that includes "server" or "client" in the
						// filename, use the escape brackets like: my-route.[server].tsx
						'**/*.server.*',
						'**/*.client.*',
					],
				})
			},
		}),
		sentryVitePlugin({
			org: 'billing-saas',
			project: 'billing-saas',
			disable: process.env.NODE_ENV !== 'production',
		}),
	],
})
