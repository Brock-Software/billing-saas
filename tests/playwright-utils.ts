import { test as base } from '@playwright/test'
import { type User as UserModel } from '@prisma/client'
import * as setCookieParser from 'set-cookie-parser'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createUser } from './db-utils.ts'

export * from './db-utils.ts'

type GetOrInsertUserOptions = {
	id?: string
	password?: string
	email?: UserModel['email']
}

type User = {
	id: string
	email: string
	name: string | null
}

async function getOrInsertUser({
	id,
}: GetOrInsertUserOptions = {}): Promise<User> {
	const select = { id: true, email: true, name: true }
	if (id) {
		return await prisma.user.findUniqueOrThrow({
			select,
			where: { id },
		})
	} else {
		const userData = createUser()
		return await prisma.user.create({
			select,
			data: {
				...userData,
				email: 'random@example.com',
				roles: { connect: { name: 'user' } },
			},
		})
	}
}

export const test = base.extend<{
	insertNewUser(options?: GetOrInsertUserOptions): Promise<User>
	login(options?: GetOrInsertUserOptions): Promise<User>
}>({
	insertNewUser: async ({}, use) => {
		let userId: string | undefined = undefined
		await use(async options => {
			const user = await getOrInsertUser(options)
			// eslint-disable-next-line no-console
			console.log(user)
			userId = user.id
			return user
		})
		await prisma.user.delete({ where: { id: userId } }).catch(() => {})
	},
	login: async ({ page }, use) => {
		let userId: string | undefined = undefined
		await use(async options => {
			const user = await getOrInsertUser(options)
			userId = user.id
			const session = await prisma.session.create({
				data: {
					expirationDate: getSessionExpirationDate(),
					userId: user.id,
				},
				select: { id: true },
			})

			const authSession = await authSessionStorage.getSession()
			authSession.set(sessionKey, session.id)
			const cookieConfig = setCookieParser.parseString(
				await authSessionStorage.commitSession(authSession),
			) as any
			await page
				.context()
				.addCookies([{ ...cookieConfig, domain: 'localhost' }])
			return user
		})
		await prisma.user.deleteMany({ where: { id: userId } })
	},
})
export const { expect } = test

/**
 * This allows you to wait for something (like an email to be available).
 *
 * It calls the callback every 50ms until it returns a value (and does not throw
 * an error). After the timeout, it will throw the last error that was thrown or
 * throw the error message provided as a fallback
 */
export async function waitFor<ReturnValue>(
	cb: () => ReturnValue | Promise<ReturnValue>,
	{
		errorMessage,
		timeout = 5000,
	}: { errorMessage?: string; timeout?: number } = {},
) {
	const endTime = Date.now() + timeout
	let lastError: unknown = new Error(errorMessage)
	while (Date.now() < endTime) {
		try {
			const response = await cb()
			if (response) return response
		} catch (e: unknown) {
			lastError = e
		}
		await new Promise(r => setTimeout(r, 100))
	}
	throw lastError
}
