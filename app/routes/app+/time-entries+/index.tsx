import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { validationError } from 'remix-validated-form'
import { z } from 'zod'

import { TimeEntriesTable } from '#app/components/models/time-entries-table.tsx'
import { TimeEntry } from '#app/domain/TimeEntry.ts'
import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server.ts'

function parseDurationToMs(duration: string) {
	const [hours, minutes, seconds] = duration.split(':').map(Number)
	return (hours * 3600 + minutes * 60 + seconds) * 1000
}

function formatUTCForDatetimeLocal(utcIsoString: string) {
	const date = new Date(utcIsoString)
	const tzOffset = date.getTimezoneOffset()
	const localDate = new Date(date.getTime() - tzOffset * 60000)
	const formattedDate = localDate.toISOString().slice(0, 16)
	return formattedDate
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const skip = parseInt(url.searchParams.get('skip') || '0', 10)
	const take = parseInt(url.searchParams.get('take') || '10', 10)
	const [entries, entriesCount, clients] = await prisma.$transaction([
		prisma.timeEntry.findMany({
			skip,
			take,
			orderBy: { startTime: 'desc' },
			include: { client: true, invoice: true },
		}),
		prisma.timeEntry.count(),
		prisma.client.findMany({
			where: { organization: { id: getOrgId(request)! } },
		}),
	])
	return json({ entries, entriesCount, clients })
}

const validator = withZod(
	z.object({
		entryId: z.string(),
		description: z.string().optional(),
		startTime: z.string().optional(),
		endTime: z.string().optional(),
		hourlyRate: z.string().optional(),
		clientId: z.string().optional(),
	}),
)

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')
	formData.delete('intent')

	switch (intent) {
		case 'start': {
			await TimeEntry.startNewEntryFromExisting({
				entryId: formData.get('entryId') as string,
				orgId: getOrgId(request)!,
			})
			return json(
				{ success: true },
				{ headers: { 'X-Remix-Revalidate': '/app+/_index/route' } },
			)
		}
		case 'stop': {
			const entryId = formData.get('entryId')
			await prisma.timeEntry.update({
				where: { id: entryId as string },
				data: { endTime: new Date().toISOString() },
			})
			return json({ success: true })
		}
		case 'delete': {
			const entryId = formData.get('entryId')
			await prisma.timeEntry.delete({ where: { id: entryId as string } })
			return json({ success: true })
		}
		case 'duplicate': {
			const entryId = formData.get('entryId')
			const entry = await prisma.timeEntry.findUniqueOrThrow({
				where: { id: entryId as string },
			})

			const { id, createdAt, updatedAt, ...entryData } = entry
			await prisma.timeEntry.create({ data: entryData })
			return json({ success: true })
		}
		case 'update-duration': {
			const entryId = formData.get('entryId')
			const duration = formData.get('duration')
			const entry = await prisma.timeEntry.findUniqueOrThrow({
				where: { id: entryId as string },
			})

			const endTime = new Date(
				new Date(entry.startTime).getTime() +
					parseDurationToMs(duration as string),
			).toISOString()
			await prisma.timeEntry.update({
				where: { id: entryId as string },
				data: { endTime },
			})
			return json({ success: true })
		}
		case 'update': {
			const { data, error } = await validator.validate(formData)
			if (error) return validationError(error)
			const { entryId, hourlyRate, clientId, ...rest } = data

			const updatedEntry = await prisma.timeEntry.update({
				where: { id: entryId },
				data: {
					hourlyRate:
						hourlyRate === undefined
							? undefined
							: hourlyRate === ''
								? null
								: Number(hourlyRate),
					...(clientId === undefined
						? {}
						: clientId === ''
							? { client: { disconnect: true } }
							: { client: { connect: { id: clientId } } }),
					...rest,
				},
			})
			return json({ entry: updatedEntry })
		}
		default: {
			return json({ error: 'Invalid intent' }, { status: 405 })
		}
	}
}

export default function Index() {
	const { entries, entriesCount, clients } = useLoaderData<typeof loader>()

	return (
		<TimeEntriesTable
			entries={entries as any}
			entriesCount={entriesCount}
			clients={clients as any}
		/>
	)
}
