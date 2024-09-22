import { Outlet } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary'

export default function Route() {
	return <Outlet />
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
