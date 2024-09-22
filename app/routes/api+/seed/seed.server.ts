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

export const featureFlags: SeedData['featureFlags'] = [
	{ name: 'courses', isEnabled: true },
]

const roles: () => Promise<SeedData['roles']> = async () => [
	{
		name: 'employee',
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
	users: [
		{
			email: 'dev@one.com',
			password: { create: { hash: await getPasswordHash('password') } },
			name: 'Dev One',
			hasSignedIn: false,
			roles: { connect: { name: 'employee' } },
		},
		{
			email: 'dev@two.com',
			password: { create: { hash: await getPasswordHash('password') } },
			name: 'Dev Two',
			hasSignedIn: false,
			roles: { connect: { name: 'employee' } },
		},
	],
})
