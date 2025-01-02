import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import omit from 'lodash/omit'
import { validationError } from 'remix-validated-form'
import { z } from 'zod'

import { TimeEntriesTable } from '#app/components/time-entries-table.tsx'
import { TimeEntry } from '#app/domain/TimeEntry.ts'
import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server.ts'

function parseDurationToMs(duration: string) {
	const [hours, minutes, seconds] = duration.split(':').map(Number)
	return (hours * 3600 + minutes * 60 + seconds) * 1000
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
	const orgId = getOrgId(request)!
	const entryId = formData.get('entryId') as string
	formData.delete('intent')

	switch (intent) {
		case 'duplicate-and-start': {
			await TimeEntry.duplicateAndStart(entryId, orgId)
			return json({ success: true })
		}
		case 'stop': {
			await TimeEntry.stop(entryId)
			return json({ success: true })
		}
		case 'delete': {
			await TimeEntry.delete(entryId)
			return json({ success: true })
		}
		case 'duplicate': {
			await TimeEntry.duplicate(entryId)
			return json({ success: true })
		}
		case 'update-duration': {
			const duration = formData.get('duration') as string
			await TimeEntry.updateDuration(entryId, duration)
			return json({ success: true })
		}
		case 'update': {
			const { data, error } = await validator.validate(formData)
			if (error) return validationError(error)
			await TimeEntry.update(entryId, omit(data, ['entryId']))
			return json({ success: true })
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
