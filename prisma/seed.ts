/* eslint-disable no-console */
import { preview } from '#app/routes/api+/seed/seed.server.js'
import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb } from '#tests/db-utils.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	const data = await preview()
	console.timeEnd('🧹 Cleaned up the database...')

	console.time('🔑 Created permissions...')
	await Promise.all(
		data.permissions.map(permission =>
			prisma.permission.create({ data: permission }),
		),
	)
	console.timeEnd('🔑 Created permissions...')

	console.time('👑 Created roles...')
	await Promise.all(data.roles.map(data => prisma.role.create({ data })))
	console.timeEnd('👑 Created roles...')

	console.time('🏴‍☠️ Created feature flags...')
	await Promise.all(
		data.featureFlags.map(data => prisma.featureFlag.create({ data })),
	)
	console.timeEnd('🏴‍☠️ Created feature flags...')

	console.time(`🔒 Created users`)
	await Promise.all(data.users.map(data => prisma.user.create({ data })))
	console.timeEnd(`🔒 Created users`)

	console.time('🔬Created modules...')
	console.timeEnd('🔬Created modules...')

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
