import { type Password, type User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { clearOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from './db.server.ts'
import { type FeatureFlags } from './featureFlags/index.ts'
import { DEFAULT_ROUTE, combineHeaders } from './misc.tsx'
import { authSessionStorage } from './session.server.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null
	const session = await prisma.session.findUnique({
		select: { user: { select: { id: true } } },
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})
	if (!session?.user) {
		throw redirect('/auth/login', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}
	return session.user.id
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/auth/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/app')
	}
}

export async function redirectIfDisabled(
	name: FeatureFlags,
	redirectUrl?: string,
) {
	const ff = await prisma.featureFlag.findUnique({ where: { name } })
	if (!ff?.isEnabled) return redirect(redirectUrl ?? DEFAULT_ROUTE)
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) void prisma.session.deleteMany({ where: { id: sessionId } })

	let headers: HeadersInit = {
		'set-cookie': await authSessionStorage.destroySession(authSession),
	}
	if (redirectTo) {
		headers = combineHeaders(headers, { 'set-cookie': clearOrgId() })
	}

	throw redirect(safeRedirect(redirectTo), { ...responseInit, headers })
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'email'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: {
			id: true,
			password: { select: { hash: true } },
			organizations: { select: { id: true } },
		},
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return {
		id: userWithPassword.id,
		orgId: userWithPassword.organizations[0].id,
	}
}

export async function login({
	email,
	password,
}: {
	email: User['email']
	password: string
}) {
	const user = await verifyUserPassword({ email }, password)
	if (!user) return null
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})
	return { session, orgId: user.orgId }
}

export async function resetUserPassword({
	email,
	password,
}: {
	email: User['email']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	return prisma.user.update({
		where: { email },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function signup({
	email,
	password,
	name,
}: {
	email: User['email']
	name: User['name']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					email: email.toLowerCase(),
					name,
					roles: {
						connectOrCreate: {
							create: { name: 'user' },
							where: { name: 'user' },
						},
					},
					password: { create: { hash: hashedPassword } },
					organizations: { create: { name: 'Default' } },
				},
			},
		},
		select: {
			id: true,
			expirationDate: true,
			user: { select: { organizations: { select: { id: true } } } },
		},
	})

	return { session, orgId: session.user.organizations[0].id }
}
