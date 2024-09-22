import { parseWithZod as parse } from '@conform-to/zod'
import {
	json,
	redirect,
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { ValidatedForm } from 'remix-validated-form'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { FormInput } from '#app/components/forms/form-input.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { requireAnonymous, resetUserPassword } from '#app/utils/auth.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordAndConfirmPasswordSchema } from '#app/utils/schemas/user.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { resetPasswordEmailSessionKey } from './reset-password.server.ts'

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema
const validator = withZod(ResetPasswordSchema)

async function requireResetPasswordEmail(request: Request) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const resetPasswordEmail = verifySession.get(resetPasswordEmailSessionKey)
	if (typeof resetPasswordEmail !== 'string' || !resetPasswordEmail) {
		throw redirect('/auth/login')
	}
	return resetPasswordEmail
}

export async function loader({ request }: LoaderFunctionArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request)
	return json({ resetPasswordEmail })
}

export async function action({ request }: ActionFunctionArgs) {
	const resetPasswordEmail = await requireResetPasswordEmail(request)
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: ResetPasswordSchema,
	})

	if (submission.status !== 'success' || !submission.value) {
		return json(submission.reply(), { status: 400 })
	}

	const { password } = submission.value
	await resetUserPassword({ email: resetPasswordEmail, password })
	const verifySession = await verifySessionStorage.getSession()
	return redirect('/auth/login', {
		headers: {
			'set-cookie': await verifySessionStorage.destroySession(verifySession),
		},
	})
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reset Password | forgetyourbudget' }]
}

export default function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>()
	const isPending = useIsPending()

	return (
		<div className="container flex flex-col justify-center pb-32 pt-20">
			<div className="text-center">
				<h1 className="text-h1">Password Reset</h1>
				<p className="text-body-md mt-3 text-muted-foreground">
					Hi, {data.resetPasswordEmail}. No worries. It happens all the time.
				</p>
			</div>
			<div className="mx-auto mt-16 min-w-full max-w-sm px-8 sm:min-w-[368px]">
				<ValidatedForm
					validator={validator}
					method="POST"
					className="flex flex-col gap-4"
				>
					<FormInput name="password" type="password" autoFocus />
					<FormInput name="confirmPassword" type="password" />
					<Button className="w-full" type="submit" disabled={isPending}>
						Reset password
					</Button>
				</ValidatedForm>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
