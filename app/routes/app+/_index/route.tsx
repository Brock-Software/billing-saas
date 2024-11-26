import { type TimeEntry } from '@prisma/client'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { Clock, Dot } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '#app/components/ui/button'
import { Input } from '#app/components/ui/input'

import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server'
import { Timer } from './timer'

export async function loader() {
	const [clients, activeTimeEntry] = await Promise.all([
		prisma.client.findMany({
			take: 5,
			select: {
				id: true,
				name: true,
				company: true,
				hourlyRate: true,
				timeEntries: {
					select: {
						startTime: true,
						endTime: true,
					},
				},
			},
		}),
		prisma.timeEntry.findFirst({ where: { endTime: null } }),
	])

	return { clients, activeTimeEntry }
}

export async function action({ request }: ActionFunctionArgs) {
	const orgId = getOrgId(request)
	const formData = await request.formData()
	const model = formData.get('model')

	if (model === 'time_entry') {
		const intent = formData.get('intent')

		switch (intent) {
			case 'start': {
				const clientId = formData.get('clientId') as string
				const description = formData.get('description') as string
				const startTime = formData.get('startTime') as string
				let hourlyRate: number | null = null

				if (clientId) {
					const client = await prisma.client.findUnique({
						where: { id: clientId, organization: { id: orgId! } },
						select: { hourlyRate: true },
					})
					hourlyRate = client?.hourlyRate ? Number(client.hourlyRate) : null
				}

				const entry = await prisma.timeEntry.create({
					data: {
						startTime: new Date(startTime),
						description,
						hourlyRate,
						...(clientId ? { client: { connect: { id: clientId } } } : {}),
					},
				})
				return json({ entry })
			}
			case 'update': {
				const entryId = formData.get('entryId')
				const description = formData.get('description') as string | null
				const clientId = formData.get('clientId')
				const startTime = formData.get('startTime') as string | undefined
				let hourlyRate: number | null = null

				if (clientId) {
					const client = await prisma.client.findUnique({
						where: { id: clientId as string, organization: { id: orgId! } },
						select: { hourlyRate: true },
					})
					hourlyRate = client?.hourlyRate ? Number(client.hourlyRate) : null
				}

				const entry = await prisma.timeEntry.update({
					where: { id: entryId as string },
					data: {
						...(description ? { description } : {}),
						...(startTime ? { startTime: new Date(startTime) } : {}),
						...(hourlyRate ? { hourlyRate } : {}),
						client: clientId
							? { connect: { id: clientId as string } }
							: undefined,
					},
				})
				return json({ entry })
			}
			case 'stop': {
				const entryId = formData.get('entryId')
				await prisma.timeEntry.update({
					where: { id: entryId as string },
					data: { endTime: new Date() },
				})
				return json({ entry: null })
			}
		}
	}

	return json({ message: 'model actions not found' }, { status: 405 })
}

export default function TimePage() {
	const { clients, activeTimeEntry } = useLoaderData<typeof loader>()
	const startTimer = useFetcher<{ entry: TimeEntry | null }>()
	const [entry, setEntry] = useState<typeof activeTimeEntry>(activeTimeEntry)

	const descriptionRef = useRef<HTMLInputElement>(null)
	const clientIdRef = useRef<HTMLSelectElement>(null)

	const handleStart = () => {
		const f = new FormData()
		f.append('model', 'time_entry')
		f.append('intent', 'start')
		f.append('startTime', new Date().toISOString())
		f.append('clientId', clientIdRef.current?.value ?? '')
		f.append('description', descriptionRef.current?.value ?? '')
		startTimer.submit(f, { method: 'post' })
	}

	const handleStop = () => {
		if (!entry) return
		const f = new FormData()
		f.append('model', 'time_entry')
		f.append('intent', 'stop')
		f.append('entryId', entry.id)
		startTimer.submit(f, { method: 'post' })
		if (descriptionRef.current) descriptionRef.current.value = ''
		if (clientIdRef.current) clientIdRef.current.value = ''
	}

	const handleDescriptionBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		if (!entry) return
		const f = new FormData()
		f.append('model', 'time_entry')
		f.append('intent', 'update')
		f.append('entryId', entry.id)
		f.append('description', event.target.value)
		startTimer.submit(f, { method: 'post' })
	}

	const handleClientChange = (clientId: string) => {
		if (!entry) return
		const f = new FormData()
		f.append('model', 'time_entry')
		f.append('intent', 'update')
		f.append('entryId', entry.id)
		f.append('clientId', clientId)
		startTimer.submit(f, { method: 'post' })
	}

	useEffect(() => {
		if (startTimer.data) {
			setEntry(startTimer.data.entry)
		}
	}, [startTimer.data])

	return (
		<div className="flex flex-col gap-6">
			<div className="flex justify-between gap-2">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<div className="flex items-center">
					<Button variant="link" asChild>
						<Link to="clients">Clients</Link>
					</Button>
					<Dot />
					<Button variant="link" asChild>
						<Link to="time-entries">Time Entries</Link>
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-3 md:h-40 md:flex-row md:gap-6">
				<div className="flex w-full flex-col gap-2 rounded border border-dashed p-4 md:w-1/2">
					<Input
						defaultValue={entry?.description ?? ''}
						placeholder="What are you working on?"
						onBlur={handleDescriptionBlur}
						className="w-full bg-white"
						name="description"
						ref={descriptionRef}
					/>

					<select
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
						onChange={e => handleClientChange(e.target.value)}
						defaultValue={entry?.clientId ?? ''}
						name="clientId"
						ref={clientIdRef}
					>
						<option value="">Select Client</option>
						{clients.map(client => (
							<option key={client.id} value={client.id}>
								{client.name}
							</option>
						))}
					</select>
					<div className="flex items-center gap-2">
						{entry && (
							<Timer
								startTime={new Date(entry.startTime)}
								onStartTimeChange={date => {
									const f = new FormData()
									f.append('model', 'time_entry')
									f.append('intent', 'update')
									f.append('entryId', entry.id)
									f.append('startTime', date.toISOString())
									startTimer.submit(f, { method: 'post' })
								}}
							/>
						)}
						<Button
							onClick={entry ? handleStop : handleStart}
							variant={entry ? 'destructive' : 'default'}
							className="h-full min-h-9 flex-1 text-lg"
						>
							<Clock size={18} className="mr-2" /> {entry ? 'Stop' : 'Start'}
						</Button>
					</div>
				</div>

				<div className="flex w-full gap-3">
					<Button variant="outline" className="h-40 w-full text-xl" size="lg">
						<div className="flex flex-col items-center gap-4">
							<div className="text-4xl">📧</div>
							<div>Send Invoice</div>
						</div>
					</Button>

					<Button variant="outline" className="h-40 w-full text-xl" size="lg">
						<div className="flex flex-col items-center gap-4">
							<div className="text-4xl">💰</div>
							<div>Record Payment</div>
						</div>
					</Button>
				</div>
			</div>
		</div>
	)
}
