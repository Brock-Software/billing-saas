import { json } from '@remix-run/node'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server'

const RequestSchema = z.object({
	model: z.string(),
	operation: z.string(),
	args: z.any(),
})

export async function action({ request }: { request: Request }) {
	const token = request.headers.get('Authorization')?.split(' ')[1]

	if (!token || token !== process.env.QUEUE_SERVICE_TOKEN) {
		return json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = await request.json()
	const result = RequestSchema.safeParse(body)

	if (!result.success) {
		return json({ error: 'Invalid request body' }, { status: 400 })
	}

	const { model, operation, args } = result.data

	try {
		// @ts-ignore - Dynamic access
		const data = await prisma[model.toLowerCase()][operation](args)
		return json(data)
	} catch (error) {
		return json({ error: 'Operation failed' }, { status: 500 })
	}
}
