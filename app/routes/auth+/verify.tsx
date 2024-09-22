import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useSearchParams } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { FormInput } from '#app/components/forms/form-input.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { handleVerification as handleChangeEmailVerification } from '#app/routes/app+/profile+/change-email'
import { requireAnonymous } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { ensurePrimary } from '#app/utils/litefs.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { handleVerification as handleLoginTwoFactorVerification } from './login/utils.server.ts'
import { handleVerification as handleOnboardingVerification } from './onboarding/utils.server.ts'
import { handleVerification as handleResetPasswordVerification } from './reset-password.server'
import { isCodeValid } from './verify.server.ts'
import {
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	VerifySchema,
	VerificationTypeSchema,
	type VerificationTypes,
} from './verify_props'

const validator = withZod(VerifySchema)

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)

	const codeIsValid = await isCodeValid({
		code: data[codeQueryParam],
		type: data[typeQueryParam],
		target: data[targetQueryParam],
	})

	if (!codeIsValid) {
		return validationError({
			fieldErrors: { [codeQueryParam]: 'Invalid code' },
		})
	}

	await ensurePrimary()

	async function deleteVerification() {
		if (!data) return
		await prisma.verification.delete({
			where: {
				target_type: {
					type: data[typeQueryParam],
					target: data[targetQueryParam],
				},
			},
		})
	}

	switch (data[typeQueryParam]) {
		case 'reset-password': {
			await deleteVerification()
			return handleResetPasswordVerification({ request, body: formData, data })
		}
		case 'onboarding': {
			await deleteVerification()
			return handleOnboardingVerification({ request, body: formData, data })
		}
		case 'change-email': {
			await deleteVerification()
			return handleChangeEmailVerification?.({ request, body: formData, data })
		}
		case '2fa': {
			return handleLoginTwoFactorVerification({ request, body: formData, data })
		}
	}
}

export default function VerifyRoute() {
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const parsedType = VerificationTypeSchema.safeParse(
		searchParams.get(typeQueryParam),
	)
	const type = parsedType.success ? parsedType.data : null

	const checkEmail = (
		<>
			<h1 className="text-h1">Check your email</h1>
			<p className="text-body-md mt-3 text-muted-foreground">
				We've sent you a code to verify your email address.
			</p>
		</>
	)

	const headings: Record<VerificationTypes, React.ReactNode> = {
		onboarding: checkEmail,
		'teacher-onboarding': checkEmail,
		'reset-password': checkEmail,
		'change-email': checkEmail,
		'2fa': (
			<>
				<h1 className="text-h1">Check your 2FA app</h1>
				<p className="text-body-md mt-3 text-muted-foreground">
					Please enter your 2FA code to verify your identity.
				</p>
			</>
		),
	}

	return (
		<main className="mx-auto w-full max-w-[400px]">
			<div className="flex flex-col gap-3 pt-4">
				<Link to="/">
					<h2 className="opacity-75">forgetyourbudget.com</h2>
				</Link>
				<div className="mb-8 mt-12 text-center md:text-left">
					<p className="text-xl">Check your email</p>
					<p className="text-foreground/70">
						Verify your email to start building.
					</p>
				</div>
				<div className="mt-12 flex flex-col justify-center gap-1">
					<ValidatedForm
						method="POST"
						validator={validator}
						className="flex-1"
						defaultValues={{
							[codeQueryParam]: searchParams.get(codeQueryParam) ?? '',
						}}
					>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<FormInput name={codeQueryParam} />
						<input type="hidden" name={typeQueryParam} value={type ?? ''} />
						<input
							type="hidden"
							name={targetQueryParam}
							value={searchParams.get(targetQueryParam) ?? ''}
						/>
						<input
							type="hidden"
							name={redirectToQueryParam}
							value={searchParams.get(redirectToQueryParam) ?? ''}
						/>
						<Button className="mt-2 w-full" type="submit" disabled={isPending}>
							Verify email
						</Button>
					</ValidatedForm>

					<Button
						className="mt-2 w-full"
						variant="link"
						type="submit"
						asChild
						disabled={isPending}
					>
						<Link to="/auth/login">Try again</Link>
					</Button>
				</div>
			</div>
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
