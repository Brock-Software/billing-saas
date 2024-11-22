import { json, type ActionFunctionArgs } from '@remix-run/node'
import { Link, useFetcher, useLoaderData, useNavigate } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { FormInput } from '#app/components/forms/form-input'
import { Button } from '#app/components/ui/button'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'

import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function loader() {
	const [clients] = await Promise.all([
		prisma.client.findMany({
			take: 5,
			select: {
				id: true,
				name: true,
				company: true,
				hourlyRate: true,
				timeEntries: {
					select: {
						hourlyRate: true,
						startTime: true,
						endTime: true,
					},
				},
			},
		}),
	])

	return { clients }
}

const validator = withZod(
	z.object({
		name: z.string().min(1, 'Name is required'),
		email: z.string().nullish(),
		hourlyRate: z.string().nullish(),
	}),
)

export async function action({ request }: ActionFunctionArgs) {
	const orgId = getOrgId(request)
	const formData = await request.formData()
	const { data, error } = await validator.validate(formData)
	if (error) return validationError(error)
	const client = await prisma.client.create({
		data: {
			...data,
			hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : null,
			organization: { connect: { id: orgId! } },
		},
	})
	return json({ client })
}

export default function Route() {
	const { clients } = useLoaderData<typeof loader>()
	const [addClientOpen, setAddClientOpen] = useState(false)
	const createClient = useFetcher()
	const isCreatingClient = createClient.state !== 'idle'
	const navigate = useNavigate()

	useEffect(() => {
		if (createClient.state === 'idle') setAddClientOpen(false)
	}, [createClient.state])

	return (
		<div className="w-full rounded-md bg-white p-4 shadow">
			<div className="mb-4 flex justify-between">
				<h2 className="text-xl font-bold">Clients</h2>
				<Sheet open={addClientOpen} onOpenChange={setAddClientOpen}>
					<SheetTrigger asChild>
						<Button variant="outline">
							<PlusIcon className="mr-2" size={16} /> New Client
						</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle> New Client</SheetTitle>
						</SheetHeader>
						<ValidatedForm
							method="post"
							className="flex flex-1 flex-col"
							validator={validator}
							fetcher={createClient}
						>
							<div className="flex flex-1 flex-col gap-4 p-4">
								<FormInput name="name" placeholder="Name" />
								<FormInput name="email" placeholder="Email" type="email" />
								<FormInput
									name="hourlyRate"
									type="number"
									min="0"
									step="0.01"
									placeholder="Hourly Rate"
								/>
							</div>
							<SheetFooter>
								<SheetClose asChild>
									<Button variant="outline" type="button">
										Cancel
									</Button>
								</SheetClose>
								<Button type="submit" disabled={isCreatingClient}>
									{isCreatingClient ? 'Creating...' : 'Create Client'}
								</Button>
							</SheetFooter>
						</ValidatedForm>
					</SheetContent>
				</Sheet>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Rate (default)</TableHead>
						<TableHead>Hours</TableHead>
						<TableHead>Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{clients.map(client => {
						const [totalHours, totalAmount] = client.timeEntries.reduce(
							([accHours, accAmount], entry) => {
								if (!entry.endTime) return [accHours, accAmount]
								const hours =
									(new Date(entry.endTime).getTime() -
										new Date(entry.startTime).getTime()) /
									1000 /
									60 /
									60
								return [
									accHours + hours,
									accAmount +
										hours *
											(entry.hourlyRate
												? Number(entry.hourlyRate)
												: client.hourlyRate
													? Number(client.hourlyRate)
													: 0),
								]
							},
							[0, 0],
						)

						return (
							<TableRow
								key={client.id}
								onClick={e => {
									if (e.metaKey || e.ctrlKey) {
										navigate(`/app/clients/${client.id}`)
									}
								}}
							>
								<TableCell>
									<Button variant="link" asChild size="sm" className="text-md">
										<Link to={`/app/clients/${client.id}`}>{client.name}</Link>
									</Button>
								</TableCell>
								<TableCell>
									${client.hourlyRate?.toString() ?? '0'}/hr
								</TableCell>
								<TableCell>{totalHours.toFixed(2)}</TableCell>
								<TableCell>${totalAmount.toFixed(2)}</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
