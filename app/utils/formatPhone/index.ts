export function formatPhoneNumber(phoneNumber: string): string {
	// Remove any non-digit characters from the input
	const cleaned = phoneNumber.replace(/\D/g, '')

	// Check if the cleaned number has exactly 10 digits
	if (cleaned.length !== 10) {
		return phoneNumber
	}

	// Format the number
	const areaCode = cleaned.slice(0, 3)
	const firstPart = cleaned.slice(3, 6)
	const secondPart = cleaned.slice(6)

	return `(${areaCode}) ${firstPart}-${secondPart}`
}
