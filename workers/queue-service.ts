/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'
import { sendInvoiceEmail } from './queue-service-utils/send-invoice-email'
import { upsertInvoicePdf } from './queue-service-utils/upsert-invoice-pdf'

type JobHandler = (prisma: PrismaClient, data: any) => Promise<void>
const handlers = new Map<string, JobHandler>()
const prisma = new PrismaClient({
	datasources: { db: { url: process.env.DATABASE_URL } },
})

// Register handlers
handlers.set('send-invoice-email', sendInvoiceEmail)
handlers.set('upsert-invoice-pdf', upsertInvoicePdf)

function pause(seconds: number) {
	return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

async function startWorker() {
	console.log('[queue-service] Worker started 🚀')

	while (true) {
		let job = await prisma.job.findFirst({
			where: { status: 'pending' },
			orderBy: { createdAt: 'asc' },
		})

		if (!job) {
			await pause(10)
			continue
		}

		console.log(`[queue-service] Processing job ${job.id}`)

		const handler = handlers.get(job.type)
		if (!handler) {
			await prisma.job.update({
				where: { id: job.id },
				data: {
					status: 'failed',
					error: `No handler registered for job type: ${job.type}`,
				},
			})
			continue
		}

		job = await prisma.job.update({
			where: { id: job.id },
			data: {
				status: 'processing',
				attempts: { increment: 1 },
			},
		})

		try {
			await handler(prisma, JSON.parse(job.data))
			await prisma.job.update({
				where: { id: job.id },
				data: { status: 'completed' },
			})
			console.log(`[queue-service] Job ${job.id} completed`)
		} catch (error) {
			await prisma.job.update({
				where: { id: job.id },
				data: {
					error: error instanceof Error ? error.message : JSON.stringify(error),
					status: job.attempts >= job.maxAttempts ? 'failed' : 'pending',
				},
			})
			console.error(`[queue-service] Job ${job.id} failed: `, error)
		}
	}
}

await startWorker()
