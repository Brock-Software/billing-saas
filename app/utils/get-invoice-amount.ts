import { type Client, type Invoice, type TimeEntry } from '@prisma/client'

export async function getInvoiceAmount(
	invoice: Invoice & { timeEntries: TimeEntry[]; client: Client },
) {
	const timeEntries = invoice.timeEntries
		.filter(entry =>
			invoice.entriesStartDate && invoice.entriesEndDate
				? entry.startTime >= invoice.entriesStartDate &&
					entry.startTime <= invoice.entriesEndDate
				: true,
		)
		.map(entry => {
			const hours = entry.endTime
				? (new Date(entry.endTime).getTime() -
						new Date(entry.startTime).getTime()) /
					1000 /
					60 /
					60
				: 0
			const rate =
				entry.hourlyRate !== null
					? Number(entry.hourlyRate)
					: invoice.client.hourlyRate !== null
						? Number(invoice.client.hourlyRate)
						: 0

			return {
				...entry,
				date: new Date(entry.startTime).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				}),
				hours,
				rate,
				amount: hours * rate,
			}
		})

	const subtotal = timeEntries.reduce((sum, entry) => sum + entry.amount, 0)
	const taxAmount = invoice.tax ? subtotal * Number(invoice.tax) : 0
	const total = subtotal + taxAmount - (Number(invoice.discount) || 0)

	return { total, subtotal, taxAmount, timeEntries }
}
