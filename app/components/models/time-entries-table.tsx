import { type Invoice, type TimeEntry, type Client } from '@prisma/client'
import { useFetcher } from '@remix-run/react'
import { Copy, EllipsisVertical, Play, StopCircle, Trash } from 'lucide-react'
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

function formatUTCForDatetimeLocal(utcIsoString: string) {
	const date = new Date(utcIsoString)
	const tzOffset = date.getTimezoneOffset()
	const localDate = new Date(date.getTime() - tzOffset * 60000)
	const formattedDate = localDate.toISOString().slice(0, 16)
	return formattedDate
}

const FORM_ACTION = '/app/time-entries'

type Props = {
	entries: JsonifyObject<
		TimeEntry & { client: Client | null; invoice: Invoice | null }
	>[]
	entriesCount: number
	clients: JsonifyObject<Client>[]
}

export function TimeEntriesTable({ entries, entriesCount, clients }: Props) {
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
												fetcher.submit(f, {
													method: 'post',
													action: FORM_ACTION,
												})
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
												fetcher.submit(f, {
													method: 'post',
													action: FORM_ACTION,
												})
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
													fetcher.submit(f, {
														method: 'post',
														action: FORM_ACTION,
													})
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
													fetcher.submit(f, {
														method: 'post',
														action: FORM_ACTION,
													})
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
														fetcher.submit(f, {
															method: 'post',
															action: FORM_ACTION,
														})
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
													fetcher.submit(f, {
														method: 'post',
														action: FORM_ACTION,
													})
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
													onSelect={() => {
														const f = new FormData()
														f.append('intent', entry.endTime ? 'start' : 'stop')
														f.append('entryId', entry.id)
														fetcher.submit(f, {
															method: 'post',
															action: FORM_ACTION,
														})
													}}
												>
													{entry.endTime ? (
														<Play size={16} className="mr-1.5" />
													) : (
														<StopCircle size={16} className="mr-1.5" />
													)}
													{entry.endTime ? 'Start' : 'Stop'}
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => {
														const f = new FormData()
														f.append('intent', 'duplicate')
														f.append('entryId', entry.id)
														fetcher.submit(f, {
															method: 'post',
															action: FORM_ACTION,
														})
													}}
												>
													<Copy size={16} className="mr-1.5" /> Duplicate
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-red-500"
													onSelect={() => {
														const f = new FormData()
														f.append('intent', 'delete')
														f.append('entryId', entry.id)
														fetcher.submit(f, {
															method: 'post',
															action: FORM_ACTION,
														})
													}}
												>
													<Trash size={16} className="mr-1.5" /> Delete
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
