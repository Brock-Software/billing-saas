import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { useState } from 'react'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { FormInput } from '#app/components/forms/form-input'
import { Button } from '#app/components/ui/button'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import { prisma } from '#app/utils/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const client = await prisma.client.findUniqueOrThrow({
		where: { id: params.id },
		include: {
			timeEntries: {
				orderBy: { startTime: 'desc' },
			},
		},
	})

	return { client }
}

const validator = withZod(
	z.object({
		name: z.string().min(1),
		email: z.string().nullish(),
		hourlyRate: z.string().nullish(),
	}),
)

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const { data, error } = await validator.validate(formData)
	if (error) return validationError(error)

	const client = await prisma.client.update({
		where: { id: params.id },
		data: {
			...data,
			hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : null,
		},
	})
	return json({ client })
}

export default function ClientDetailsRoute() {
	const { client } = useLoaderData<typeof loader>()
	const [isEditing, setIsEditing] = useState(false)

	const totalDuration = client.timeEntries.reduce((acc, entry) => {
		const duration = entry.endTime
			? (new Date(entry.endTime).getTime() -
					new Date(entry.startTime).getTime()) /
				1000 /
				60 /
				60
			: 0
		return acc + duration
	}, 0)

	const totalAmount = totalDuration * Number(client.hourlyRate)

	const formatAmount = (amount: number) => {
		return amount.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			{isEditing ? (
				<ValidatedForm
					validator={validator}
					method="POST"
					defaultValues={{
						name: client.name,
						email: client.email ?? '',
						hourlyRate: client.hourlyRate?.toString() ?? '',
					}}
					className="grid grid-cols-2 gap-2"
				>
					<FormInput name="name" label="Name" />
					<FormInput name="email" label="Email" />
					<FormInput name="hourlyRate" label="Hourly Rate" type="number" />
					<Button
						type="submit"
						className="col-span-2"
						onClick={e => {
							e.currentTarget.form?.submit()
							setIsEditing(false)
						}}
					>
						Save Changes
					</Button>
				</ValidatedForm>
			) : (
				<div className="flex items-center justify-between rounded-lg bg-gray-100 p-4 shadow-md">
					<div>
						<p className="mb-2 text-2xl font-semibold text-gray-800">
							{client.name}
						</p>
						<div className="mt-2 flex items-center gap-6">
							<p className="text-sm text-gray-600">
								Email: {client.email ?? 'N/A'}
							</p>
							<p className="text-sm text-gray-600">
								Hourly Rate: ${Number(client.hourlyRate).toFixed(2) ?? 'N/A'}
							</p>
						</div>
					</div>
					<Button onClick={() => setIsEditing(true)} variant="outline">
						Edit
					</Button>
				</div>
			)}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Duration</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{client.timeEntries.map(entry => {
						const duration = entry.endTime
							? (new Date(entry.endTime).getTime() -
									new Date(entry.startTime).getTime()) /
								1000 /
								60 /
								60
							: 0

						const amount = duration * Number(client.hourlyRate)

						return (
							<TableRow key={entry.id}>
								<TableCell>
									{new Date(entry.startTime).toLocaleDateString()}
								</TableCell>
								<TableCell>{entry.description}</TableCell>
								<TableCell>{duration.toFixed(2)} hrs</TableCell>
								<TableCell>${formatAmount(amount)}</TableCell>
								<TableCell>
									{entry.invoiceId
										? 'Billed'
										: entry.endTime
											? 'Completed'
											: 'In Progress'}
								</TableCell>
							</TableRow>
						)
					})}
					<TableRow className="font-medium">
						<TableCell>Total</TableCell>
						<TableCell />
						<TableCell>{totalDuration.toFixed(2)} hrs</TableCell>
						<TableCell>${formatAmount(totalAmount)}</TableCell>
						<TableCell />
					</TableRow>
				</TableBody>
			</Table>
		</div>
	)
}
