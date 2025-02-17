import { type Prisma } from '@prisma/client'
import { getPasswordHash } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server'

type SeedData = {
	users: Prisma.UserCreateInput[]
	roles: Prisma.RoleCreateInput[]
	featureFlags: Prisma.FeatureFlagCreateInput[]
	permissions: Prisma.PermissionCreateInput[]
}

export const permissions: SeedData['permissions'] = [
	{ entity: 'user', action: 'update', access: 'own' },
	{ entity: 'user', action: 'read', access: 'own' },
	{ entity: 'user', action: 'create', access: 'any' },
	{ entity: 'user', action: 'update', access: 'any' },
	{ entity: 'user', action: 'read', access: 'any' },
	{ entity: 'user', action: 'delete', access: 'any' },
]

export const featureFlags: SeedData['featureFlags'] = []

const roles: () => Promise<SeedData['roles']> = async () => [
	{
		name: 'user',
		permissions: {
			connect: await prisma.permission.findMany({
				select: { id: true },
				where: { access: 'any' },
			}),
		},
	},
]

export const preview: () => Promise<SeedData> = async () => ({
	roles: await roles(),
	featureFlags,
	permissions,
	organizations: [
		{
			name: 'Default',
		},
	],
	clients: [
		{
			name: 'Client One',
			hourlyRate: 100,
		},
		{
			name: 'Client Two',
			hourlyRate: 150,
		},
	],
	timeEntries: [
		{
			description: 'Client One',
			startTime: new Date(),
			endTime: new Date(),
			hourlyRate: 100,
			organization: { connect: { name: 'Default' } },
			client: { connect: { name: 'Client One' } },
		},
		{
			description: 'Client Two',
			startTime: new Date(),
			endTime: new Date(),
			hourlyRate: 150,
			organization: { connect: { name: 'Default' } },
			client: { connect: { name: 'Client Two' } },
		},
	],
	users: [
		{
			email: 'dev@one.com',
			password: { create: { hash: await getPasswordHash('password') } },
			name: 'Dev One',
			hasSignedIn: false,
			roles: { connect: { name: 'user' } },
			organizations: { create: { name: 'Default' } },
		},
		{
			email: 'dev@two.com',
			password: { create: { hash: await getPasswordHash('password') } },
			name: 'Dev Two',
			hasSignedIn: false,
			roles: { connect: { name: 'user' } },
			organizations: { create: { name: 'Default' } },
		},
	],
})

export const production: () => Promise<SeedData> = async () => ({
	roles: await roles(),
	featureFlags,
	permissions,
	users: [],
})
