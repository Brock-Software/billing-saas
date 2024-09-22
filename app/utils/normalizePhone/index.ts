export function normalizePhone(phoneNumber: string): string {
	const digits = phoneNumber.replace(/\D/g, '')
	return digits.length === 11 && digits.startsWith('1')
		? digits.substring(1)
		: digits
}
