import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import { Link, useLoaderData, useSearchParams } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { FormCheckbox } from '#app/components/forms/form-checkbox.tsx'
import { FormInput } from '#app/components/forms/form-input.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { requireAnonymous, sessionKey, signup } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.js'
import {
	NameSchema,
	PasswordAndConfirmPasswordSchema,
} from '#app/utils/schemas/user.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { onboardingEmailSessionKey } from './utils.server.ts'

export const SignupFormSchema = z
	.object({
		name: NameSchema,
		remember: z.boolean().optional(),
		redirectTo: z.string().optional(),
	})
	.and(PasswordAndConfirmPasswordSchema)

export const validator = withZod(SignupFormSchema)

async function requireOnboardingEmail(request: Request) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		throw redirect('/auth/signup')
	}
	return email
}
export async function loader({ request }: LoaderFunctionArgs) {
	const email = await requireOnboardingEmail(request)
	return json({ email })
}

export async function action({ request }: ActionFunctionArgs) {
	const email = await requireOnboardingEmail(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)
	const { data, error } = await validator.validate(formData)
	if (error) return validationError(error)
	const { remember, redirectTo } = data
	const session = await signup({ ...data, email })

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(sessionKey, session.id)
	const verifySession = await verifySessionStorage.getSession()
	const headers = new Headers()
	headers.append(
		'set-cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	)
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return redirectWithToast(
		safeRedirect(redirectTo),
		{ title: 'Welcome', description: 'Thanks for signing up!' },
		{ headers },
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup billing-saas Account' }]
}

export default function SignupRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const redirectTo = searchParams.get('redirectTo') ?? undefined

	return (
		<div className="mx-auto w-full max-w-lg px-2 pb-20">
			<div className="px-8 pt-4">
				<Link to="/">
					<h2 className="opacity-75">billing-saas</h2>
				</Link>
				<div className="mb-8 mt-12 text-center md:text-left">
					<p className="text-xl">Let's goooo.</p>
					<p className="text-foreground/70">
						Last step before legacy building.
					</p>
				</div>
			</div>
			<ValidatedForm
				validator={validator}
				method="POST"
				className="mx-auto mt-20 flex min-w-full max-w-lg flex-col gap-3 px-8 sm:min-w-[368px]"
				defaultValues={{ redirectTo }}
			>
				<AuthenticityTokenInput />
				<HoneypotInputs />
				<FormInput name="name" label="Name" autoComplete="name" />
				<FormInput
					name="password"
					label="Password"
					type="password"
					autoComplete="new-password"
				/>
				<FormInput
					name="confirmPassword"
					label="Confirm Password"
					type="password"
					autoComplete="new-password"
				/>
				<FormCheckbox name="remember" label="Remember me" />
				<input type="hidden" name="redirectTo" value={redirectTo ?? '/app'} />
				<Button className="mt-4 w-full" type="submit" disabled={isPending}>
					Create an account
				</Button>
			</ValidatedForm>
		</div>
	)
}
