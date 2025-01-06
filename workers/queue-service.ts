/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'
import { sendInvoiceEmail } from './queue-service-utils/send-invoice-email'
import { upsertInvoicePdf } from './queue-service-utils/upsert-invoice-pdf'

type JobHandler = (prisma: PrismaClient, data: any) => Promise<void>
const handlers = new Map<string, JobHandler>()

const writeOperations = [
	'create',
	'createMany',
	'update',
	'updateMany',
	'upsert',
	'delete',
	'deleteMany',
]

// The queue service is it's own process & machine on fly. However, only 1 machine can be the primary 'write' machine,
// and that will always be the primary 'app' service. That means all other machines can only read, not write to the database.
// This works fine for all instances of the 'app' since they just forward incoming requests to the primary when it's a write
// request (POST, DELETE, etc). However, we need to be able to write to the database from the queue service.
// To do this, we're using a custom 'write' endpoint on the 'app' service that is protected by a token.
// The queue service will call this endpoint with the appropriate token to perform any write operations.

const prisma = new PrismaClient().$extends({
	query: {
		$allModels: {
			...writeOperations.reduce(
				(acc, operation) => {
					acc[operation] = async ({ model, operation, args }: any) => {
						const response = await fetch(
							`${process.env.BASE_URL}/api/queue-service/write`,
							{
								method: 'POST',
								body: JSON.stringify({ model, operation, args }),
								headers: {
									Authorization: `Bearer ${process.env.QUEUE_SERVICE_TOKEN}`,
									'Content-Type': 'application/json',
								},
							},
						)
						const json = await response.json()
						return json
					}
					return acc
				},
				{} as Record<any, any>,
			),
		},
	},
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
			await handler(prisma as any, JSON.parse(job.data))
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
