import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { requireAnonymous } from '#app/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export default function AuthIndex() {
	return (
		<div className="flex h-screen">
			<div className="flex w-full justify-center border-r border-gray-200 shadow-xl lg:w-1/3">
				<Outlet />
			</div>
			<div className="hidden w-2/3 lg:block">
				<img
					src="/img/auth.webp"
					alt="Authentication"
					className="h-full w-full object-cover"
				/>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
