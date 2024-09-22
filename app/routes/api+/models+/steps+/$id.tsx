import { json, type ActionFunctionArgs } from '@remix-run/node'
import { withZod } from '@remix-validated-form/with-zod'
import { validationError } from 'remix-validated-form'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

const PATCH = withZod(
	z.object({
		completedAt: z.enum(['on', 'off']).optional(),
		snoozeTill: z.string().optional(),
	}),
)

const PUT = withZod(
	z.object({
		title: z.string().min(1, 'Title is required'),
		description: z.string().nullable().optional(),
		duration: zfd.numeric(z.number().min(5).max(60)),
	}),
)

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const method = request.method.toUpperCase()

	if (method === 'DELETE') {
		await prisma.step.delete({ where: { id: params.id, goal: { userId } } })
		return json({ success: true })
	}

	if (method === 'PATCH') {
		const formData = await request.formData()
		const { error, data } = await PATCH.validate(formData)
		if (error) return validationError(error)

		const step = await prisma.step.update({
			where: { id: params.id, goal: { userId } },
			data: {
				...(data.completedAt === 'on'
					? { completedAt: new Date() }
					: data.completedAt === 'off'
						? { completedAt: null }
						: {}),
				...(data.snoozeTill && { snoozeTill: new Date(data.snoozeTill) }),
			},
		})
		return json({ step })
	}

	if (method === 'PUT') {
		const formData = await request.formData()
		const { error, data } = await PUT.validate(formData)
		if (error) return validationError(error)

		const step = await prisma.step.update({
			where: { id: params.id, goal: { userId } },
			data,
		})
		return json({ step })
	}

	return json({ error: 'Method not allowed' }, { status: 405 })
}
