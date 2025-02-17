import { redirect } from '@remix-run/node'
import { validationError } from 'remix-validated-form'
import { prisma } from '#app/utils/db.server'
import { verifySessionStorage } from '#app/utils/verification.server'
import { type VerifyFunctionArgs } from './verify.server'

export const resetPasswordEmailSessionKey = 'resetPasswordEmail'

export async function handleVerification({ data }: VerifyFunctionArgs) {
	const target = data.target
	const user = await prisma.user.findFirst({
		where: { email: target },
		select: { email: true },
	})

	if (!user) {
		return validationError({ fieldErrors: { code: 'Invalid code' } })
	}

	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(resetPasswordEmailSessionKey, user.email)
	return redirect('/auth/reset-password', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
