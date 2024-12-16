import { Check, PlusCircle } from 'lucide-react'
import { useSearchParams } from '@remix-run/react'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { cn } from '#app/utils/misc.tsx'

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
										Clear filters
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
