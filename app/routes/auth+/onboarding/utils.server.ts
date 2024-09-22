import { redirect } from '@remix-run/node'
import { verifySessionStorage } from '#app/utils/verification.server'
import { type VerifyFunctionArgs } from '../verify.server'

export const onboardingEmailSessionKey = 'onboardingEmail'

export async function handleVerification({ data }: VerifyFunctionArgs) {
	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(onboardingEmailSessionKey, data.target)
	return redirect('/auth/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
