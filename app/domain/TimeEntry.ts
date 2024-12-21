import { prisma } from '#app/utils/db.server.ts'

export class TimeEntry {
	static async startNewEntryFromExisting({
		entryId,
		orgId,
	}: {
		entryId: string
		orgId: string
	}) {
		const entry = await prisma.timeEntry.findUniqueOrThrow({
			where: { id: entryId as string },
		})

		await this.stopRunningEntries({ orgId })
		return this.createEntryFromTemplate(entry)
	}

	private static async stopRunningEntries({ orgId }: { orgId: string }) {
		await prisma.timeEntry.updateMany({
			where: {
				endTime: null,
				client: { organization: { id: orgId } },
			},
			data: { endTime: new Date().toISOString() },
		})
	}

	private static async createEntryFromTemplate(entry: any) {
		const { id, createdAt, updatedAt, endTime, ...entryData } = entry
		return prisma.timeEntry.create({
			data: { ...entryData, startTime: new Date().toISOString() },
		})
	}
}
