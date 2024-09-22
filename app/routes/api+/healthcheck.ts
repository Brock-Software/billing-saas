// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { prisma } from '#app/utils/db.server.ts'

export async function loader() {
	try {
		// if we can connect to the database and make a simple query
		// and make a HEAD request to ourselves, then we're good.
		await Promise.all([prisma.user.count()])
		return new Response('OK')
	} catch (error: unknown) {
		// eslint-disable-next-line no-console
		console.log('healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
