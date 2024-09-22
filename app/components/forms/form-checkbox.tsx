import { useRef } from 'react'
import { useControlField, useField } from 'remix-validated-form'
import { Checkbox, type CheckboxProps } from '../ui/checkbox'

type Props = CheckboxProps & {
	name: string
	label: string
	helperText?: string
}

export function FormCheckbox({
	name,
	label,
	className,
	helperText,
	...props
}: Props) {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [value, setValue] = useControlField(name)
	const { error } = useField(name)
	const id = props.id ?? name
	const errorId = error ? `${id}-error` : undefined

	return (
		<div className={className}>
			<div className="flex gap-2">
				<Checkbox
					id={id}
					ref={buttonRef}
					aria-invalid={errorId ? true : undefined}
					aria-describedby={errorId}
					{...props}
					onCheckedChange={state => {
						const value = state.valueOf() ? 'on' : 'off'
						setValue(value)
						props.onCheckedChange?.(state)
					}}
					onFocus={event => props.onFocus?.(event)}
					onBlur={event => props.onBlur?.(event)}
					type="button"
					checked={value === 'on'}
					className="mt-1"
				/>
				<div>
					<label htmlFor={id}>{label}</label>
					{helperText ? (
						<p className="text-sm text-muted-foreground">{helperText}</p>
					) : null}
				</div>
			</div>
			<div className="min-h-2">
				{error ? <p className="mt-0.5 text-xs">{error}</p> : null}
			</div>
		</div>
	)
}
