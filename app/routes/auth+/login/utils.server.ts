import { redirect } from '@remix-run/node'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { twoFAVerificationType } from '#app/routes/app+/profile+/two-factor+/route.js'
import { getUserId, sessionKey } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { combineHeaders, combineResponseInits } from '#app/utils/misc'
import { authSessionStorage } from '#app/utils/session.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { verifySessionStorage } from '#app/utils/verification.server'
import { type VerifyFunctionArgs, getRedirectToUrl } from '../verify.server'

export const verifiedTimeKey = 'verified-time'
export const unverifiedSessionIdKey = 'unverified-session-id'
export const rememberKey = 'remember'

export async function handleNewSession(
	{
		request,
		session,
		redirectTo,
	}: {
		request: Request
		session: { userId: string; id: string; expirationDate: Date }
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const verification = await prisma.verification.findUnique({
		select: { id: true },
		where: {
			target_type: { target: session.userId, type: twoFAVerificationType },
		},
	})
	const userHasTwoFactor = Boolean(verification)

	let headers = new Headers()
	if (userHasTwoFactor) {
		const verifySession = await verifySessionStorage.getSession()
		verifySession.set(unverifiedSessionIdKey, session.id)
		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: session.userId,
			redirectTo,
		})

		headers = combineHeaders(headers, {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		})

		return redirect(
			`${redirectUrl.pathname}?${redirectUrl.searchParams}`,
			combineResponseInits({ headers }, responseInit),
		)
	} else {
		const authSession = await authSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		authSession.set(sessionKey, session.id)

		headers = combineHeaders(headers, {
			'set-cookie': await authSessionStorage.commitSession(authSession, {
				expires: session.expirationDate,
			}),
		})

		return redirect(
			safeRedirect(redirectTo),
			combineResponseInits({ headers }, responseInit),
		)
	}
}

export async function handleVerification({
	request,
	data,
}: VerifyFunctionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const remember = verifySession.get(rememberKey)
	const { redirectTo } = data
	const headers = new Headers()
	authSession.set(verifiedTimeKey, Date.now())

	const unverifiedSessionId = verifySession.get(unverifiedSessionIdKey)
	if (unverifiedSessionId) {
		const session = await prisma.session.findUnique({
			select: { expirationDate: true },
			where: { id: unverifiedSessionId },
		})
		if (!session) {
			throw await redirectWithToast('/auth/login', {
				type: 'error',
				title: 'Invalid session',
				description: 'Could not find session to verify. Please try again.',
			})
		}
		authSession.set(sessionKey, unverifiedSessionId)

		headers.append(
			'set-cookie',
			await authSessionStorage.commitSession(authSession, {
				expires: remember ? session.expirationDate : undefined,
			}),
		)
	} else {
		headers.append(
			'set-cookie',
			await authSessionStorage.commitSession(authSession),
		)
	}

	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return redirect(safeRedirect(redirectTo), { headers })
}

export async function shouldRequestTwoFA(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	if (verifySession.has(unverifiedSessionIdKey)) return true
	const userId = await getUserId(request)
	if (!userId) return false
	// if it's over two hours since they last verified, we should request 2FA again
	const userHasTwoFA = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
	if (!userHasTwoFA) return false
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0)
	const twoHours = 1000 * 60 * 2
	return Date.now() - verifiedTime > twoHours
}
