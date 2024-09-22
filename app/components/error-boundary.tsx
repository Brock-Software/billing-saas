import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
	useRouteError,
	useNavigate,
} from '@remix-run/react'
import { captureRemixErrorBoundaryError } from '@sentry/remix'
import { getErrorMessage } from '#app/utils/misc.tsx'
import { Button } from './ui/button'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<p>
			{error.status} {error.data}
		</p>
	),
	statusHandlers,
	unexpectedErrorHandler = error => <p>{getErrorMessage(error)}</p>,
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
	const error = useRouteError()
	captureRemixErrorBoundaryError(error)
	const params = useParams()
	const navigate = useNavigate()

	if (typeof document !== 'undefined') {
		// eslint-disable-next-line no-console
		console.error(error)
	}

	return (
		<div className="flex flex-col items-center justify-center p-20">
			<h1 className="font-handwriting text-[50px] text-primary">😥 Oops!</h1>
			<p className="my-6 text-center font-handwriting text-xl text-primary">
				Our servers are still learning to ride without training wheels.
			</p>
			<code className="rounded-sm px-2">
				{isRouteErrorResponse(error)
					? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
							error,
							params,
						})
					: unexpectedErrorHandler(error)}
			</code>
			<Button onClick={() => navigate('/app')} size="lg" className="mt-8">
				Go home
			</Button>
		</div>
	)
}
