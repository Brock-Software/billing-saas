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

	// Helper function to create dates
	const createDate = (date: Date, day: number, hour = 9) => {
		const newDate = new Date(date)
		newDate.setDate(day)
		newDate.setHours(hour, 0, 0, 0)
		return newDate
	}

	// Current month entries - create entries every few days
	const currentMonthEntries = []
	for (let day = 1; day <= baseDate.getDate(); day += 2) {
		currentMonthEntries.push(
			prisma.timeEntry.create({
				data: {
					description: 'Development work',
					startTime: createDate(baseDate, day, 9),
					endTime: createDate(baseDate, day, 17),
					hourlyRate: 100,
					clientId: clientOne.id,
				},
			}),
			prisma.timeEntry.create({
				data: {
					description: 'Design work',
					startTime: createDate(baseDate, day, 10),
					endTime: createDate(baseDate, day, 15),
					hourlyRate: 150,
					clientId: clientTwo.id,
				},
			}),
			prisma.timeEntry.create({
				data: {
					description: 'Consulting',
					startTime: createDate(baseDate, day, 13),
					endTime: createDate(baseDate, day, 18),
					hourlyRate: 200,
					clientId: clientThree.id,
				},
			}),
		)
	}

	// Previous month entries - create entries for the entire month
	const lastMonthEntries = []
	const daysInLastMonth = new Date(
		lastMonth.getFullYear(),
		lastMonth.getMonth() + 1,
		0,
	).getDate()

	for (let day = 1; day <= daysInLastMonth; day += 2) {
		lastMonthEntries.push(
			prisma.timeEntry.create({
				data: {
					description: 'Previous Month Development',
					startTime: createDate(lastMonth, day, 9),
					endTime: createDate(lastMonth, day, 17),
					hourlyRate: 100,
					clientId: clientOne.id,
				},
			}),
			prisma.timeEntry.create({
				data: {
					description: 'Previous Month Design',
					startTime: createDate(lastMonth, day, 10),
					endTime: createDate(lastMonth, day, 16),
					hourlyRate: 150,
					clientId: clientTwo.id,
				},
			}),
			prisma.timeEntry.create({
				data: {
					description: 'Previous Month Consulting',
					startTime: createDate(lastMonth, day, 11),
					endTime: createDate(lastMonth, day, 19),
					hourlyRate: 200,
					clientId: clientThree.id,
				},
			}),
		)
	}

	await Promise.all([...currentMonthEntries, ...lastMonthEntries])
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
