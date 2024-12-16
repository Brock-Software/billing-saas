import { PrismaClient } from '@prisma/client'
import { createInvoicePdf } from './queue-service-utils/create-invoice-pdf'
import { sendInvoiceEmail } from './queue-service-utils/send-invoice-email'

type JobHandler = (data: any) => Promise<void>
const handlers = new Map<string, JobHandler>()
const prisma = new PrismaClient()

// Register handlers
handlers.set('send-invoice-email', sendInvoiceEmail)
handlers.set('create-invoice-pdf', createInvoicePdf)

function pause(seconds: number) {
	return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

async function startWorker() {
	while (true) {
		const job = await prisma.job.findFirst({
			where: { status: 'pending' },
			orderBy: { createdAt: 'asc' },
		})

		if (!job) {
			await pause(10)
			continue
		}

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

		await prisma.job.update({
			where: { id: job.id },
			data: {
				status: 'processing',
				attempts: { increment: 1 },
			},
		})

		try {
			await handler(JSON.parse(job.data))
			await prisma.job.update({
				where: { id: job.id },
				data: { status: 'completed' },
			})
		} catch (error) {
			await prisma.job.update({
				where: { id: job.id },
				data: {
					error: error instanceof Error ? error.message : JSON.stringify(error),
					status: job.attempts >= job.maxAttempts ? 'failed' : 'pending',
				},
			})
		}
	}
}

startWorker()
