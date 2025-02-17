import { remember } from '@epic-web/remember'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

export const prisma = remember('prisma', () => {
	// NOTE: if you change anything in this function you'll need to restart
	// the dev server to see your changes.

	// Feel free to change this log threshold to something that makes sense for you
	const logThreshold = 20

	const libsql = createClient({
		url: `${process.env.TURSO_DATABASE_URL}`,
		authToken: `${process.env.TURSO_AUTH_TOKEN}`,
	})

	const adapter = new PrismaLibSQL(libsql)
	const client = new PrismaClient({
		adapter,
		log: [
			{ level: 'query', emit: 'event' },
			{ level: 'error', emit: 'stdout' },
			{ level: 'warn', emit: 'stdout' },
		],
	})
	client.$on('query', async (e: any) => {
		if (e.duration < logThreshold) return
		const color =
			e.duration < logThreshold * 1.1
				? 'green'
				: e.duration < logThreshold * 1.2
					? 'blue'
					: e.duration < logThreshold * 1.3
						? 'yellow'
						: e.duration < logThreshold * 1.4
							? 'redBright'
							: 'red'
		const dur = chalk[color](`${e.duration}ms`)
		// eslint-disable-next-line no-console
		console.info(`prisma:query - ${dur} - ${e.query}`)
	})
	client.$connect()
	return client
})
