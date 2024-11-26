import * as E from '@react-email/components'
import {
	redirect,
	type MetaFunction,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { json, Link } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { FormInput } from '#app/components/forms/form-input.tsx'
import { Button, buttonVariants } from '#app/components/ui/button.tsx'
import { requireAnonymous } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { EmailSchema } from '#app/utils/schemas/user.ts'
import { prepareVerification } from './verify.server.ts'

const SignupSchema = z.object({
	email: EmailSchema,
})

const validator = withZod(SignupSchema)

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()

	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)

	const { email } = data
	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	})
	if (existingUser) {
		return validationError({
			fieldErrors: {
				email: 'A user already exists with this email',
			},
		})
	}

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'onboarding',
		target: email,
	})

	const response = await sendEmail({
		to: email,
		subject: `Welcome to billing-saas`,
		react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
	})

	if (response.status === 'success') {
		return redirect(redirectTo.toString())
	} else {
		return validationError({
			fieldErrors: { email: response.error.message },
		})
	}
}

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Welcome to billing-saas</E.Text>
				</h1>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Sign Up | billing-saas' }]
}

export default function SignupRoute() {
	const isPending = useIsPending()

	return (
		<div className="w-full max-w-md px-8 pt-4">
			<Link to="/">
				<h2 className="opacity-75">billing-saas</h2>
			</Link>
			<div className="mb-8 mt-12 text-center md:text-left">
				<p className="text-xl">Get started</p>
				<p className="text-foreground/70">
					Create an account to start billing.
				</p>
			</div>
			<ValidatedForm method="POST" validator={validator}>
				<AuthenticityTokenInput />
				<HoneypotInputs />
				<FormInput
					type="email"
					name="email"
					autoFocus
					preventValidationOnBlur
				/>
				<Button className="mt-4 w-full" type="submit" disabled={isPending}>
					Sign up
				</Button>
			</ValidatedForm>
			<div className="mt-6 text-center md:text-left">
				<span className="text-gray-600">Already have an account?</span>{' '}
				<Link className={buttonVariants({ variant: 'link' })} to="/auth/login">
					Sign in
				</Link>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
