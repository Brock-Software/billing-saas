import { useRef, useState } from 'react'
import { useOnClickOutside } from '#app/hooks/useClickOutside.js'
import { Button, type ButtonProps } from './ui/button'

type Props = ButtonProps & {
	clickedChildren?: React.ReactNode
	clickedProps?: ButtonProps
}

export const DoubleClickButton = ({
	onClick,
	children,
	clickedProps,
	clickedChildren,
	...props
}: Props) => {
	const [clicked, setClicked] = useState(false)
	const ref = useRef<HTMLButtonElement>(null)
	useOnClickOutside(ref, () => setClicked(false))

	return (
		<Button
			{...props}
			{...(clicked ? clickedProps : {})}
			onClick={e => (clicked ? onClick?.(e) : setClicked(true))}
			ref={ref}
		>
			{clickedChildren && clicked ? clickedChildren : children}
		</Button>
	)
}
