import { json, type ActionFunctionArgs } from '@remix-run/node'
import { withZod } from '@remix-validated-form/with-zod'
import { validationError } from 'remix-validated-form'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

const POST = withZod(
	z.object({
		id: z.string().optional(),
		goalId: z.string(),
		title: z.string().min(1, 'Title is required'),
		description: z.string().nullable().optional(),
		duration: zfd.numeric(z.number().min(5).max(60)),
	}),
)

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const result = await POST.validate(formData)

	if (result.error) {
		return validationError(result.error)
	}

	const { title, description, duration, goalId } = result.data

	const step = await prisma.step.create({
		data: {
			title,
			description,
			duration,
			goalId,
		},
	})

	return json({ step })
}
