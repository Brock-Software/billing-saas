import { prisma } from '#app/utils/db.server.ts'

export class TimeEntry {
	static async duplicateAndStart(entryId: string, orgId: string) {
		const entry = await prisma.timeEntry.findUniqueOrThrow({
			where: { id: entryId },
		})

		// Stop all running entries for the same org (only if the org has enabled auto-stop)
		await prisma.timeEntry.updateMany({
			where: {
				endTime: null,
				client: { organization: { is: { id: orgId, autoStop: true } } },
			},
			data: { endTime: new Date().toISOString() },
		})

		// Create a new entry from the template
		const { id, createdAt, updatedAt, endTime, ...entryData } = entry
		return prisma.timeEntry.create({
			data: { ...entryData, startTime: new Date().toISOString() },
		})
	}

	static async stop(entryId: string) {
		return prisma.timeEntry.update({
			where: { id: entryId },
			data: { endTime: new Date().toISOString() },
		})
	}

	static async delete(entryId: string) {
		return prisma.timeEntry.delete({ where: { id: entryId } })
	}

	static async duplicate(entryId: string) {
		const entry = await prisma.timeEntry.findUniqueOrThrow({
			where: { id: entryId },
		})

		const { id, createdAt, updatedAt, ...entryData } = entry
		return prisma.timeEntry.create({ data: entryData })
	}

	static async updateDuration(entryId: string, duration: string) {
		const entry = await prisma.timeEntry.findUniqueOrThrow({
			where: { id: entryId },
		})

		const endTime = new Date(
			new Date(entry.startTime).getTime() + this.parseDurationToMs(duration),
		).toISOString()

		return prisma.timeEntry.update({
			where: { id: entryId },
			data: { endTime },
		})
	}

	static async update(
		entryId: string,
		data: {
			hourlyRate?: string | null
			clientId?: string
			description?: string
			startTime?: string
			endTime?: string
		},
	) {
		const { hourlyRate, clientId, ...rest } = data

		return prisma.timeEntry.update({
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
	}

	private static parseDurationToMs(duration: string) {
		const [hours, minutes, seconds] = duration.split(':').map(Number)
		return (hours * 3600 + minutes * 60 + seconds) * 1000
	}
}
