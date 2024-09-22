import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { redirect, useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { FormInput } from '#app/components/forms/form-input.js'
import { Button } from '#app/components/ui/button'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { NameSchema } from '#app/utils/schemas/user'

export const handle = { showBackButton: true }

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			image: { select: { id: true } },
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	})

	return json({ user })
}

const validator = withZod(
	z.object({
		name: NameSchema.min(1, 'Name is required').max(40, 'Name is too long'),
	}),
)

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)

	await prisma.user.update({ where: { id: userId }, data: { name: data.name } })

	return redirect('/app')
}

export default function ProfileRoute() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="flex h-full grow flex-col gap-4">
			<div className="flex flex-grow flex-col gap-2">
				<ValidatedForm
					method="POST"
					className="flex flex-col gap-2"
					validator={validator}
					defaultValues={{ name: data.user.name ?? '' }}
				>
					<FormInput name="name" type="text" />
					<Button type="submit" className="mt-1">
						Save changes
					</Button>
				</ValidatedForm>
			</div>
		</div>
	)
}
