import { Link, Outlet } from '@remix-run/react'
import { LockClosedIcon } from '#app/components/icons'
import { buttonVariants } from '#app/components/ui/button'
import { type VerificationTypes } from '#app/routes/auth+/verify_props.js'
import { type BreadcrumbHandle } from '#app/utils/breadcrumb'

export const handle: BreadcrumbHandle = {
	breadcrumb: (
		<Link
			to="/app/profile/two-factor"
			className={buttonVariants({ variant: 'ghost', size: 'sm' })}
		>
			<LockClosedIcon className="mr-2" /> Two factor
		</Link>
	),
}

export const twoFAVerificationType = '2fa' satisfies VerificationTypes

export default function TwoFactorRoute() {
	return <Outlet />
}
