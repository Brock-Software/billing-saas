/* eslint-disable no-console */
import { getPasswordHash } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb } from '#tests/db-utils.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	console.time('🔑 Created permissions...')
	await prisma.permission.createMany({
		data: [
			{ entity: 'user', action: 'update', access: 'own' },
			{ entity: 'user', action: 'read', access: 'own' },
			{ entity: 'user', action: 'create', access: 'any' },
			{ entity: 'user', action: 'update', access: 'any' },
			{ entity: 'user', action: 'read', access: 'any' },
			{ entity: 'user', action: 'delete', access: 'any' },
		],
	})
	console.timeEnd('🔑 Created permissions...')

	console.time('👑 Created roles...')
	const role = await prisma.role.create({
		data: {
			name: 'user',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'any' },
				}),
			},
		},
	})
	console.timeEnd('👑 Created roles...')

	console.time('🏢 Created organizations...')
	const org = await prisma.organization.create({
		data: { name: 'Default' },
	})
	console.timeEnd('🏢 Created organizations...')

	console.time('👥 Created clients...')
	const [clientOne, clientTwo, clientThree] = await Promise.all([
		prisma.client.create({
			data: {
				name: 'Client One',
				company: 'Company One',
				hourlyRate: 100,
				orgId: org.id,
				email: 'client@one.com',
			},
		}),
		prisma.client.create({
			data: {
				name: 'Client Two',
				company: 'Company Two',
				hourlyRate: 150,
				orgId: org.id,
				email: 'client@two.com',
			},
		}),
		prisma.client.create({
			data: {
				name: 'Client Three',
				company: 'Company Three',
				hourlyRate: 200,
				orgId: org.id,
				email: 'client@three.com',
			},
		}),
	])
	console.timeEnd('👥 Created clients...')

	console.time('⏱️ Created time entries...')
	const baseDate = new Date()
	const lastMonth = new Date(baseDate)
	lastMonth.setMonth(lastMonth.getMonth() - 1)

	// Current month entries
	await Promise.all([
		prisma.timeEntry.create({
			data: {
				description: 'Development work',
				startTime: new Date(baseDate.setHours(baseDate.getHours() - 2)),
				endTime: new Date(),
				hourlyRate: 100,
				clientId: clientOne.id,
			},
		}),
		prisma.timeEntry.create({
			data: {
				description: 'Design work',
				startTime: new Date(baseDate.setDate(baseDate.getDate() - 1)),
				endTime: new Date(baseDate.setHours(baseDate.getHours() + 3)),
				hourlyRate: 150,
				clientId: clientTwo.id,
			},
		}),
		prisma.timeEntry.create({
			data: {
				description: 'Consulting',
				startTime: new Date(baseDate.setDate(baseDate.getDate() - 2)),
				endTime: new Date(baseDate.setHours(baseDate.getHours() + 4)),
				hourlyRate: 200,
				clientId: clientThree.id,
			},
		}),
	])

	// Previous month entries
	await Promise.all([
		prisma.timeEntry.create({
			data: {
				description: 'Previous Month Development',
				startTime: new Date(lastMonth.setDate(5)),
				endTime: new Date(lastMonth.setHours(lastMonth.getHours() + 6)),
				hourlyRate: 100,
				clientId: clientOne.id,
			},
		}),
		prisma.timeEntry.create({
			data: {
				description: 'Previous Month Design',
				startTime: new Date(lastMonth.setDate(12)),
				endTime: new Date(lastMonth.setHours(lastMonth.getHours() + 4)),
				hourlyRate: 150,
				clientId: clientTwo.id,
			},
		}),
		prisma.timeEntry.create({
			data: {
				description: 'Previous Month Consulting',
				startTime: new Date(lastMonth.setDate(18)),
				endTime: new Date(lastMonth.setHours(lastMonth.getHours() + 8)),
				hourlyRate: 200,
				clientId: clientThree.id,
			},
		}),
		prisma.timeEntry.create({
			data: {
				description: 'Previous Month Development 2',
				startTime: new Date(lastMonth.setDate(25)),
				endTime: new Date(lastMonth.setHours(lastMonth.getHours() + 5)),
				hourlyRate: 100,
				clientId: clientOne.id,
			},
		}),
	])
	console.timeEnd('⏱️ Created time entries...')

	console.time(`🔒 Created users`)
	await prisma.user.create({
		data: {
			email: 'dev@one.com',
			password: { create: { hash: await getPasswordHash('password') } },
			name: 'Dev One',
			roles: { connect: { id: role.id } },
			organizations: { connect: { id: org.id } },
		},
	})
	console.timeEnd(`🔒 Created users`)

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
