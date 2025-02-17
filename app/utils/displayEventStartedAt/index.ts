export function displayEventStartedAt(inputDate: string | Date): string {
	const now = new Date()
	const diff = new Date(inputDate).getTime() - now.getTime()
	const absDiff = Math.abs(diff)

	if (diff >= 0) {
		const minutes = Math.floor(absDiff / (1000 * 60))
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60

		if (hours > 0) {
			return `in ${hours} hour${hours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`
		} else {
			if (minutes < 1) return 'happening now'
			return `in ${minutes} minute${minutes > 1 ? 's' : ''}`
		}
	} else {
		const minutes = Math.floor(absDiff / (1000 * 60))
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60

		if (hours > 0) {
			return `started ${hours} hour${hours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} ago`
		} else {
			if (minutes < 1) return 'happening now'
			return `started ${minutes} minute${minutes > 1 ? 's' : ''} ago`
		}
	}
}
