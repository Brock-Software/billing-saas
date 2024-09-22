import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	type LoaderFunctionArgs,
	json,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useNavigate,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { useEffect } from 'react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { GlobalLoading } from './components/global-loading.tsx'
import { Toaster } from './components/toaster.tsx'
import { useNonce } from './contexts/nonce.ts'
import {
	type Theme,
	getTheme,
} from './routes/api+/preferences+/theme/cookie.server.ts'
import { useTheme } from './routes/api+/preferences+/theme/route.tsx'
import handwritingFont from './styles/nunito.css?url'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { csrf } from './utils/csrf.server.ts'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { cn, combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: LinksFunction = () => {
	return [
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
		cssBundleHref ? { rel: 'preload', href: cssBundleHref, as: 'style' } : null,
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
		{ rel: 'preload', href: handwritingFont, as: 'style' },
		{ rel: 'stylesheet', href: handwritingFont },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'forgetyourbudget' : 'Error | forgetyourbudget' },
		{ name: 'description', content: `Your own captain's log` },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
							deviceToken: true,
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		await logout({ request, redirectTo: '/app' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken()
	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: { theme: getTheme() },
			},
			ENV: getEnv(),
			toast,
			honeyProps,
			csrfToken,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
				csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = { 'Server-Timing': loaderHeaders.get('Server-Timing') ?? '' }
	return headers
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html
			lang="en"
			className={cn('h-full overflow-x-hidden', { dark: theme === 'dark' })}
		>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
				/>
				<meta name="theme-color" content="#ffffff" />
				<Links />
			</head>
			<body className="h-screen">
				<div className="h-full rounded-lg bg-background" vaul-drawer-wrapper="">
					{children}
				</div>
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const nonce = useNonce()
	const theme = useTheme()

	useEffect(() => {
		SplashScreen.hide()

		CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
			const slug = event.url.split('.app').pop()
			if (slug) navigate(slug)
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			<GlobalLoading />
			<div className="flex h-screen min-h-screen flex-col justify-between">
				<div className="flex-1">
					<Outlet />
				</div>
			</div>
			<Toaster toast={data.toast} />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<HoneypotProvider {...data.honeyProps}>
				<App />
			</HoneypotProvider>
		</AuthenticityTokenProvider>
	)
}

export default withSentry(AppWithProviders)

export function ErrorBoundary() {
	const nonce = useNonce()
	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	)
}
