import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { Copy, EllipsisVertical, Trash } from 'lucide-react'
import { validationError } from 'remix-validated-form'
import { z } from 'zod'
import { Pagination } from '#app/components/table/pagination.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '#app/components/ui/dropdown-menu.tsx'
import {
	Table,
	TableCell,
	TableRow,
	TableBody,
	TableHead,
	TableHeader,
} from '#app/components/ui/table.tsx'
import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server.ts'

function parseDurationToMs(duration: string) {
	const [hours, minutes, seconds] = duration.split(':').map(Number)
	return (hours * 3600 + minutes * 60 + seconds) * 1000
}

function formatUTCForDatetimeLocal(utcIsoString: string) {
	const date = new Date(utcIsoString)
	const tzOffset = date.getTimezoneOffset()
	const localDate = new Date(date.getTime() - tzOffset * 60000)
	const formattedDate = localDate.toISOString().slice(0, 16)
	return formattedDate
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const skip = parseInt(url.searchParams.get('skip') || '0', 10)
	const take = parseInt(url.searchParams.get('take') || '10', 10)
	const [entries, entriesCount, clients] = await prisma.$transaction([
		prisma.timeEntry.findMany({
			skip,
			take,
			orderBy: { startTime: 'desc' },
			include: { client: true, invoice: { select: { status: true } } },
		}),
		prisma.timeEntry.count(),
		prisma.client.findMany({
			where: { organization: { id: getOrgId(request)! } },
		}),
	])
	return json({ entries, entriesCount, clients })
}

const validator = withZod(
	z.object({
		entryId: z.string(),
		description: z.string().optional(),
		startTime: z.string().optional(),
		endTime: z.string().optional(),
		hourlyRate: z.string().optional(),
		clientId: z.string().optional(),
	}),
)

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')
	formData.delete('intent')

	switch (intent) {
		case 'delete': {
			const entryId = formData.get('entryId')
			await prisma.timeEntry.delete({ where: { id: entryId as string } })
			return json({ success: true })
		}
		case 'duplicate': {
			const entryId = formData.get('entryId')
			const entry = await prisma.timeEntry.findUniqueOrThrow({
				where: { id: entryId as string },
			})

			const { id, createdAt, updatedAt, ...entryData } = entry
			await prisma.timeEntry.create({ data: entryData })
			return json({ success: true })
		}
		case 'update-duration': {
			const entryId = formData.get('entryId')
			const duration = formData.get('duration')
			const entry = await prisma.timeEntry.findUniqueOrThrow({
				where: { id: entryId as string },
			})

			const endTime = new Date(
				new Date(entry.startTime).getTime() +
					parseDurationToMs(duration as string),
			).toISOString()
			await prisma.timeEntry.update({
				where: { id: entryId as string },
				data: { endTime },
			})
			return json({ success: true })
		}
		case 'update': {
			const { data, error } = await validator.validate(formData)
			if (error) return validationError(error)
			const { entryId, hourlyRate, clientId, ...rest } = data

			const updatedEntry = await prisma.timeEntry.update({
				where: { id: entryId },
				data: {
					hourlyRate:
						hourlyRate === undefined
							? undefined
							: hourlyRate === ''
								? null
								: Number(hourlyRate),
					...(clientId === undefined
						? {}
						: clientId === ''
							? { client: { disconnect: true } }
							: { client: { connect: { id: clientId } } }),
					...rest,
				},
			})
			return json({ entry: updatedEntry })
		}
		default: {
			return json({ error: 'Invalid intent' }, { status: 405 })
		}
	}
}

export default function Index() {
	const { entries, entriesCount, clients } = useLoaderData<typeof loader>()
	const fetcher = useFetcher()

	return (
		<div>
			<div className="w-full rounded-md bg-white p-4 shadow">
				<h2 className="mb-4 text-xl font-bold">Time Entries</h2>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Client</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Time</TableHead>
							<TableHead>Rate</TableHead>
							<TableHead>Total</TableHead>
							<TableHead>Status</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{entries.map(entry => {
							const duration = entry.endTime
								? (new Date(entry.endTime).getTime() -
										new Date(entry.startTime).getTime()) /
									1000 /
									60 /
									60
								: 0

							console.log(entry.startTime)

							return (
								<TableRow key={entry.id} className="group hover:bg-gray-100">
									<TableCell>
										<select
											className="w-full rounded border bg-transparent px-1 py-1"
											value={entry.client?.id ?? ''}
											onChange={event => {
												const f = new FormData()
												f.append('intent', 'update')
												f.append('entryId', entry.id)
												f.append('clientId', event.target.value)
												fetcher.submit(f, { method: 'post' })
											}}
										>
											<option value="">Select client</option>
											{clients.map(client => (
												<option key={client.id} value={client.id}>
													{client.name}
												</option>
											))}
										</select>
									</TableCell>
									<TableCell>
										<input
											type="text"
											className="w-full bg-transparent"
											defaultValue={entry.description ?? ''}
											onBlur={event => {
												const f = new FormData()
												f.append('intent', 'update')
												f.append('entryId', entry.id)
												f.append('description', event.target.value)
												fetcher.submit(f, { method: 'post' })
											}}
										/>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<input
												type="text"
												className="w-24 bg-transparent"
												defaultValue={`${String(Math.floor((duration * 60 * 60) / 3600)).padStart(2, '0')}:${String(Math.floor(((duration * 60 * 60) / 60) % 60)).padStart(2, '0')}:${String(Math.floor((duration * 60 * 60) % 60)).padStart(2, '0')}`}
												pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
												maxLength={8}
												onBlur={event => {
													const f = new FormData()
													f.append('intent', 'update-duration')
													f.append('entryId', entry.id)
													f.append('duration', event.target.value)
													fetcher.submit(f, { method: 'post' })
												}}
											/>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<input
												type="datetime-local"
												className="bg-transparent"
												defaultValue={formatUTCForDatetimeLocal(
													entry.startTime,
												)}
												onBlur={event => {
													if (!event.target.value) return
													const f = new FormData()
													f.append('intent', 'update')
													f.append('entryId', entry.id)
													f.append(
														'startTime',
														new Date(event.target.value).toISOString(),
													)
													fetcher.submit(f, { method: 'post' })
												}}
											/>
											{' - '}
											{entry.endTime ? (
												<input
													type="datetime-local"
													className="bg-transparent"
													defaultValue={formatUTCForDatetimeLocal(
														entry.endTime,
													)}
													onBlur={event => {
														if (!event.target.value) return
														const f = new FormData()
														f.append('intent', 'update')
														f.append('entryId', entry.id)
														f.append(
															'endTime',
															new Date(event.target.value).toISOString(),
														)
														fetcher.submit(f, { method: 'post' })
													}}
												/>
											) : (
												'In Progress'
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center">
											<span
												className={`mr-1 ${!entry.hourlyRate ? (!entry.client?.hourlyRate ? 'hidden' : 'opacity-50') : ''}`}
											>
												$
											</span>
											<input
												type="text"
												className="w-24 bg-transparent"
												onFocus={e => e.target.select()}
												placeholder={
													entry.client?.hourlyRate
														? `${entry.client.hourlyRate} (default)`
														: ''
												}
												defaultValue={
													entry.hourlyRate
														? Number(entry.hourlyRate).toFixed(2)
														: ''
												}
												onBlur={event => {
													const f = new FormData()
													f.append('intent', 'update')
													f.append('entryId', entry.id)
													f.append('hourlyRate', event.target.value)
													fetcher.submit(f, { method: 'post' })
												}}
											/>
										</div>
									</TableCell>
									<TableCell>
										{entry.hourlyRate
											? `$${(Number(entry.hourlyRate) * duration).toFixed(2)}`
											: entry.client?.hourlyRate
												? `$${(Number(entry.client.hourlyRate) * duration).toFixed(2)}`
												: ''}
									</TableCell>
									<TableCell>
										{entry.invoice
											? entry.invoice.status === 'PAID'
												? 'Paid'
												: 'Billed'
											: entry.endTime
												? 'Completed'
												: 'In Progress'}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="outline" size="icon">
													<EllipsisVertical size={16} />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<DropdownMenuItem
													className="text-red-500"
													onSelect={() => {
														const f = new FormData()
														f.append('intent', 'delete')
														f.append('entryId', entry.id)
														fetcher.submit(f, { method: 'post' })
													}}
												>
													<Trash size={16} className="mr-1.5" /> Delete
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => {
														const f = new FormData()
														f.append('intent', 'duplicate')
														f.append('entryId', entry.id)
														fetcher.submit(f, { method: 'post' })
													}}
												>
													<Copy size={16} className="mr-1.5" /> Duplicate
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>
			<div className="mt-4">
				<Pagination totalCount={entriesCount} />
			</div>
		</div>
	)
}
