import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useSearchParams } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { FormInput } from '#app/components/forms/form-input.js'
import { Button, buttonVariants } from '#app/components/ui/button'
import { login, requireAnonymous } from '#app/utils/auth.server'
import { checkHoneypot } from '#app/utils/honeypot.server'
import { DEFAULT_ROUTE, useIsPending } from '#app/utils/misc'
import { EmailSchema, PasswordSchema } from '#app/utils/schemas/user'
import { handleNewSession } from './utils.server'

const Schema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	redirectTo: z.string().nullish(),
})
const validator = withZod(Schema)

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	// await validateCSRF(formData, request.headers)
	checkHoneypot(formData)
	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)

	const session = await login(data)

	if (session) {
		return handleNewSession({
			request,
			session,
			redirectTo: data.redirectTo ?? DEFAULT_ROUTE,
		})
	} else {
		return validationError(
			{ fieldErrors: { email: 'Invalid email or password' } },
			data,
		)
	}
}

export default function LoginPage() {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	return (
		<div className="w-full max-w-md px-8 pt-4">
			<Link to="/">
				<h2 className="opacity-75">billing-saas</h2>
			</Link>
			<div className="mb-8 mt-12 text-center md:text-left">
				<p className="text-xl">Sign in</p>
				<p className="text-foreground/70">Get back to building.</p>
			</div>
			<ValidatedForm
				validator={validator}
				method="POST"
				defaultValues={{ redirectTo, email: '', password: '' }}
				className="flex flex-col gap-2"
			>
				<AuthenticityTokenInput />
				<HoneypotInputs />
				<input type="hidden" name="redirectTo" value={redirectTo ?? '/app'} />
				<FormInput
					type="email"
					name="email"
					autoComplete="email"
					autoFocus
					preventValidationOnBlur
				/>
				<FormInput
					type="password"
					name="password"
					autoComplete="current-password"
					preventValidationOnBlur
				/>
				<div className="flex items-center justify-end">
					<Link
						to="/auth/forgot-password"
						className={buttonVariants({ variant: 'link' })}
					>
						Forgot password?
					</Link>
				</div>
				<Button className="w-full" type="submit" isLoading={isPending}>
					Log in
				</Button>
			</ValidatedForm>
			<div className="mt-6 text-center md:text-left">
				<span className="text-gray-600">New here?</span>{' '}
				<Link
					className={buttonVariants({ variant: 'link' })}
					to={
						redirectTo
							? `/auth/signup?${encodeURIComponent(redirectTo)}`
							: '/auth/signup'
					}
				>
					Create an account
				</Link>
			</div>
		</div>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Login to billing-saas' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
