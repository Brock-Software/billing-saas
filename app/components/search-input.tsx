import { XCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebounce } from '#app/hooks/useDebounce'
import { cn } from '#app/utils/misc'
import { MagnifyingGlassIcon } from './icons'
import { Input } from './ui/input'

type Props = {
	onChange: (value: string) => void
}

export function SearchInput({ onChange }: Props) {
	const [search, setSearch] = useState('')
	const [debouncedSearch] = useDebounce(search, 400)

	useEffect(() => {
		onChange(debouncedSearch)
	}, [debouncedSearch, onChange])

	return (
		<div className="relative w-full">
			<Input
				placeholder="Search"
				className="w-full"
				value={search}
				onChange={e => setSearch(e.target.value)}
				leftIcon={
					<MagnifyingGlassIcon
						className={cn(
							'pointer-events-none h-5 w-5 text-foreground opacity-75',
						)}
					/>
				}
				rightIcon={
					search ? (
						<XCircleIcon className="opacity-50" onClick={() => setSearch('')} />
					) : null
				}
			/>
			<input type="submit" hidden />
		</div>
	)
}
