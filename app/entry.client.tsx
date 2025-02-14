import { RemixBrowser } from '@remix-run/react'
import * as Sentry from '@sentry/react'
import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	Sentry.init({
		dsn: 'https://afc6e58e3a9b4f954e82224184bc9205@o4506989399375872.ingest.us.sentry.io/4506989404880896',
		tracesSampleRate: 1,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1,
		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration(),
		],
	})

	import('./utils/monitoring.client.tsx').then(({ init }) => init())
}

startTransition(() => {
	hydrateRoot(document, <RemixBrowser />)
})
