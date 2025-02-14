import { type ComponentPropsWithRef, useState } from 'react'
import { useControlField } from 'remix-validated-form'
import { Input } from './input'

function fromFormatted(formattedPhone: string): string {
	return formattedPhone.replace(/\D/g, '')
}

function toFormatted(phone: string): string {
	const digits = phone.replace(/\D/g, '')
	const trimmedDigits = digits.slice(0, 10)
	const match = trimmedDigits.match(/^(\d{1,3})(\d{0,3})(\d{0,4})$/)
	if (!match) return ''

	let formatted = ''
	if (match[1]) formatted = `(${match[1]}`
	if (match[2]) formatted += `) ${match[2]}`
	if (match[3]) formatted += `-${match[3]}`
	return formatted
}

export const PhoneInput = ({
	name,
	...props
}: ComponentPropsWithRef<typeof Input> & { name: string }) => {
	const [value, setValue] = useControlField<string>(name)
	const [formatted, setFormatted] = useState(
		toFormatted(value?.toString() || ''),
	)

	return (
		<>
			<input type="hidden" value={value} name={name} />
			<Input
				{...props}
				type="tel"
				inputMode="tel"
				autoComplete="tel"
				value={formatted}
				onBlur={e => props.onBlur?.({ ...e, target: { ...e.target, name } })}
				onChange={e => {
					const formattedPhoneNumber = toFormatted(e.target.value)
					setFormatted(formattedPhoneNumber)

					const strippedPhoneNumber = fromFormatted(e.target.value).slice(0, 10)
					setValue(strippedPhoneNumber)
					props.onChange?.({
						...e,
						target: { ...e.target, value: strippedPhoneNumber, name },
					})
				}}
				placeholder="(555) 123-4567"
			/>
		</>
	)
}
