import { forwardRef, useEffect, useId } from 'react'
import { useControlField, useField } from 'remix-validated-form'
import { cn } from '#app/utils/misc'
import { startCase } from '#app/utils/startCase'
import { InfoCircledIcon } from '../icons'
import { Input, type InputProps } from '../ui/input'
import { PhoneInput } from '../ui/phone-input'
import { Tooltip } from '../ui/tooltip'

interface Props extends InputProps {
	name: string
	type?: InputProps['type'] | 'phone'
	label?: string
	labelInfo?: string
	hideLabel?: boolean
	className?: string
	classNameInput?: string
	helperText?: string
	preventValidationOnBlur?: boolean
}

function Component(
	{
		label,
		type,
		labelInfo,
		hideLabel,
		className,
		classNameInput,
		helperText,
		name,
		preventValidationOnBlur,
		defaultValue,
		...props
	}: Props,
	ref: any,
) {
	const fallbackId = useId()
	const id = props.id ?? fallbackId
	const { error, getInputProps } = useField(name)
	const errorId = error?.length ? `${id}-error` : undefined
	const InputComponent = type === 'phone' ? PhoneInput : Input
	const [value, onChange] = useControlField<
		string | number | readonly string[] | undefined
	>(name)

	const hasDefaultValue = defaultValue !== undefined
	useEffect(() => {
		if (hasDefaultValue) {
			onChange(defaultValue)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasDefaultValue])

	return (
		<div className={cn('flex flex-col gap-1', className)}>
			{labelInfo ? (
				<label htmlFor={id}>
					<span className="flex items-center gap-2">
						{label ?? startCase(name)}{' '}
						<Tooltip text={<p className="max-w-[300px]">{labelInfo}</p>}>
							<InfoCircledIcon />
						</Tooltip>
					</span>
				</label>
			) : hideLabel ? null : (
				<label htmlFor={id}>{label ?? startCase(name)}</label>
			)}
			<InputComponent
				aria-invalid={errorId ? true : undefined}
				aria-describedby={errorId}
				variant={errorId ? 'destructive' : undefined}
				className={cn(classNameInput, type === 'email' ? 'lowercase' : '')}
				{...getInputProps({
					id,
					...props,
					value,
					type: type ?? 'text',
					onChange: e => onChange(e.target.value),
				})}
				{...(preventValidationOnBlur && { onBlur: props.onBlur })}
				ref={ref}
			/>
			{helperText ? (
				<p className="text-xs text-muted-foreground">{helperText}</p>
			) : null}
			{error ? (
				<p className="text-left text-[12px] text-destructive">{error}</p>
			) : null}
		</div>
	)
}

export const FormInput = forwardRef(Component)
