import { useSearchParams } from '@remix-run/react'
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
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import { type DateRange } from 'react-day-picker'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar } from '#app/components/ui/calendar.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { cn } from '#app/utils/misc.tsx'

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

	const [date, setDate] = React.useState<DateRange | undefined>(
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
