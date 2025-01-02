import { type Invoice, type TimeEntry, type Client } from '@prisma/client'
import { useFetcher, useSearchParams, useSubmit } from '@remix-run/react'
import {
	format,
	startOfMonth,
	endOfMonth,
	subMonths,
	subDays,
	startOfYear,
	endOfYear,
	subYears,
} from 'date-fns'
import {
	Copy,
	EllipsisVertical,
	Play,
	StopCircle,
	Trash,
	Check,
	PlusCircle,
	CalendarIcon,
} from 'lucide-react'
import { useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Pagination } from '#app/components/table/pagination.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar } from '#app/components/ui/calendar.tsx'
import {
	Command,
	CommandGroup,
	CommandList,
	CommandInput,
	CommandEmpty,
	CommandItem,
	CommandSeparator,
} from '#app/components/ui/command.tsx'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '#app/components/ui/dropdown-menu.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import {
	Table,
	TableCell,
	TableRow,
	TableBody,
	TableHead,
	TableHeader,
} from '#app/components/ui/table.tsx'
import { cn } from '#app/utils/misc.tsx'

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount)
}

const formatDuration = (minutes: number) => {
	const roundedMinutes = Math.ceil(minutes)
	const hours = Math.floor(roundedMinutes / 60)
	const remainingMinutes = roundedMinutes % 60
	return `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`
}

function formatUTCForDatetimeLocal(utcIsoString: string) {
	const date = new Date(utcIsoString)
	const tzOffset = date.getTimezoneOffset()
	const localDate = new Date(date.getTime() - tzOffset * 60000)
	const formattedDate = localDate.toISOString().slice(0, 16)
	return formattedDate
}

type Props = {
	entries: JsonifyObject<
		TimeEntry & { client: Client | null; invoice: Invoice | null }
	>[]
	entriesCount: number
	clients: JsonifyObject<Client>[]
	formAction?: string
	reports?: {
		unbilledAmount: number
		unbilledTime: number
		billedAmount: number
		billedTime: number
		paidAmount: number
		paidTime: number
	}
}

export function TimeEntriesTable({
	entries,
	entriesCount,
	clients,
	formAction = '/app/time-entries',
	reports,
}: Props) {
	const fetcher = useFetcher()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()

	return (
		<div>
			<div className="w-full rounded-md bg-white p-4 shadow">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-bold">Time Entries</h2>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<ClientFilter
							options={clients.map(client => ({
								label: client.name,
								value: client.id,
							}))}
							onChange={selectedClients => {
								const params = new URLSearchParams(searchParams)
								if (selectedClients.length) {
									params.set('clients', selectedClients.join(','))
								} else {
									params.delete('clients')
								}
								submit(params)
							}}
						/>
						<CalendarDateRangePicker
							className="w-auto"
							onChange={range => {
								const params = new URLSearchParams(searchParams)
								if (range?.from) {
									params.set('startDate', range.from.toISOString())
								} else {
									params.delete('startDate')
								}
								if (range?.to) {
									params.set('endDate', range.to.toISOString())
								} else {
									params.delete('endDate')
								}
								submit(params)
							}}
						/>
					</div>
				</div>
				{reports ? (
					<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div className="group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md">
							<div className="flex flex-col gap-2">
								<div className="text-sm font-medium text-muted-foreground">
									Billable Time
								</div>
								<div className="text-3xl font-bold text-primary">
									{formatCurrency(reports.unbilledAmount)}
								</div>
								<div className="text-sm text-muted-foreground">
									{formatDuration(reports.unbilledTime)}
								</div>
							</div>
							<div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500/10 group-hover:bg-blue-500/20" />
						</div>

						<div className="group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md">
							<div className="flex flex-col gap-2">
								<div className="text-sm font-medium text-muted-foreground">
									Billed Time
								</div>
								<div className="text-3xl font-bold text-orange-600">
									{formatCurrency(reports.billedAmount)}
								</div>
								<div className="text-sm text-muted-foreground">
									{formatDuration(reports.billedTime)}
								</div>
							</div>
							<div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500/10 group-hover:bg-orange-500/20" />
						</div>

						<div className="group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md">
							<div className="flex flex-col gap-2">
								<div className="text-sm font-medium text-muted-foreground">
									Paid Time
								</div>
								<div className="text-3xl font-bold text-green-600">
									{formatCurrency(reports.paidAmount)}
								</div>
								<div className="text-sm text-muted-foreground">
									{formatDuration(reports.paidTime)}
								</div>
							</div>
							<div className="absolute inset-x-0 bottom-0 h-1 bg-green-500/10 group-hover:bg-green-500/20" />
						</div>
					</div>
				) : null}
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
													action: formAction,
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
													action: formAction,
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
														action: formAction,
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
														action: formAction,
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
															action: formAction,
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
														action: formAction,
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
											? entry.invoice.paidAt
												? 'Paid'
												: new Date(entry.invoice.dueDate) < new Date()
													? 'Overdue'
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
														f.append(
															'intent',
															entry.endTime ? 'duplicate-and-start' : 'stop',
														)
														f.append('entryId', entry.id)
														fetcher.submit(f, {
															method: 'post',
															action: formAction,
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
															action: formAction,
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
															action: formAction,
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

export const ClientFilter = ({
	options,
	onChange,
}: {
	options: { label: string; value: string }[]
	onChange?: (values: string[]) => void
}) => {
	const [searchParams] = useSearchParams()
	const selectedValues = searchParams.get('clients')?.split(',') || []

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" className="h-8 gap-1 border-dashed">
					<PlusCircle size={16} />
					Client
					{selectedValues?.length > 0 && (
						<>
							<Separator orientation="vertical" className="mx-2 h-4" />
							<Badge
								variant="secondary"
								className="rounded-sm px-1 font-normal lg:hidden"
							>
								{selectedValues.length}
							</Badge>
							<div className="hidden space-x-1 lg:flex">
								{selectedValues.length > 2 ? (
									<Badge
										variant="secondary"
										className="rounded-sm px-1 font-normal"
									>
										{selectedValues.length} selected
									</Badge>
								) : (
									options
										.filter(option => selectedValues.includes(option.value))
										.map(option => (
											<Badge
												variant="secondary"
												key={option.value}
												className="rounded-sm px-1 font-normal"
											>
												{option.label}
											</Badge>
										))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0" align="start">
				<Command>
					<CommandInput placeholder="Search clients" />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map(option => {
								const isSelected = selectedValues.includes(option.value)
								return (
									<CommandItem
										key={option.value}
										onSelect={() => {
											const newValues = isSelected
												? selectedValues.filter(value => value !== option.value)
												: [...selectedValues, option.value]
											onChange?.(newValues)
										}}
									>
										<div
											className={cn(
												'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'opacity-50 [&_svg]:invisible',
											)}
										>
											<Check />
										</div>
										<span>{option.label}</span>
									</CommandItem>
								)
							})}
						</CommandGroup>
						{selectedValues.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onChange?.([])}
										className="justify-center text-center"
									>
										Clear clients
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

const presets = [
	{
		label: 'This Month',
		getValue: () => ({
			from: startOfMonth(new Date()),
			to: endOfMonth(new Date()),
		}),
	},
	{
		label: 'Last Month',
		getValue: () => ({
			from: startOfMonth(subMonths(new Date(), 1)),
			to: endOfMonth(subMonths(new Date(), 1)),
		}),
	},
	{
		label: 'Last 90 Days',
		getValue: () => ({
			from: subDays(new Date(), 90),
			to: new Date(),
		}),
	},
	{
		label: 'This Year',
		getValue: () => ({
			from: startOfYear(new Date()),
			to: endOfYear(new Date()),
		}),
	},
	{
		label: 'Last Year',
		getValue: () => ({
			from: startOfYear(subYears(new Date(), 1)),
			to: endOfYear(subYears(new Date(), 1)),
		}),
	},
]

export function CalendarDateRangePicker({
	className,
	onChange,
}: Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
	onChange?: (range: DateRange | undefined) => void
}) {
	const [searchParams] = useSearchParams()
	const startDate = searchParams.get('startDate')
	const endDate = searchParams.get('endDate')

	const [date, setDate] = useState<DateRange | undefined>(
		startDate && endDate
			? {
					from: new Date(startDate),
					to: new Date(endDate),
				}
			: undefined,
	)

	return (
		<div className={cn('grid gap-2', className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						className={cn(
							'justify-start text-left font-normal',
							!date && 'text-muted-foreground',
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y')} -{' '}
									{format(date.to, 'LLL dd, y')}
								</>
							) : (
								format(date.from, 'LLL dd, y')
							)
						) : (
							<span>All Time</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="mr-2 flex w-auto p-0" align="start">
					<div className="border-b border-border p-3">
						<div className="flex flex-col gap-2">
							{presets.map(preset => (
								<Button
									key={preset.label}
									variant="ghost"
									size="sm"
									className="w-full justify-start font-normal"
									onClick={() => {
										const newDate = preset.getValue()
										setDate(newDate)
										onChange?.(newDate)
									}}
								>
									{preset.label}
								</Button>
							))}
						</div>
					</div>
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={newDate => {
							setDate(newDate)
							onChange?.(newDate)
						}}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
