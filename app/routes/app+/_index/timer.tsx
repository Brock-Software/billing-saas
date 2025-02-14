import { useState, useEffect } from 'react'
import { Input } from '#app/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover'

export function Timer({
	startTime,
	onStartTimeChange,
}: {
	startTime: Date
	onStartTimeChange: (date: Date) => void
}) {
	const [elapsed, setElapsed] = useState(0)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed(Date.now() - new Date(startTime).getTime())
		}, 1000)
		return () => clearInterval(interval)
	}, [startTime])

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const newDate = new Date(startTime)
		const [hours, minutes] = e.target.value.split(':')
		newDate.setHours(Number(hours), Number(minutes))
		onStartTimeChange(newDate)
		setIsOpen(false)
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger className="rounded border bg-muted px-3 py-1 text-lg font-bold tabular-nums shadow-sm">
				{`${String(Math.floor(elapsed / 1000 / 60 / 60)).padStart(2, '0')}:${String(Math.floor((elapsed / 1000 / 60) % 60)).padStart(2, '0')}:${String(Math.floor((elapsed / 1000) % 60)).padStart(2, '0')}`}
			</PopoverTrigger>
			<PopoverContent className="w-auto">
				<label htmlFor="startTime">Edit Start Time</label>
				<Input
					id="startTime"
					type="time"
					defaultValue={startTime.toLocaleTimeString('en-GB').slice(0, 5)}
					onBlur={handleBlur}
				/>
			</PopoverContent>
		</Popover>
	)
}
