import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'

interface JobData {
	id: string
	type: string
	data: any
	status: 'pending' | 'processing' | 'completed' | 'failed' | string
	createdAt: Date
	updatedAt: Date
	attempts: number
	maxAttempts: number
	error?: string | null
}

interface JobHandler {
	(data: any): Promise<void>
}

class QueueService extends EventEmitter {
	private prisma: PrismaClient
	private handlers: Map<string, JobHandler>
	private processing: boolean
	private maxConcurrent: number
	private processingCount: number

	constructor(maxConcurrent = 3) {
		super()
		this.prisma = new PrismaClient()
		this.handlers = new Map()
		this.processing = false
		this.maxConcurrent = maxConcurrent
		this.processingCount = 0
	}

	// Register a handler for a specific job type
	registerHandler(jobType: string, handler: JobHandler) {
		this.handlers.set(jobType, handler)
	}

	// Add a job to the queue
	async addJob(type: string, data: any, maxAttempts = 3): Promise<string> {
		const job = await this.prisma.job.create({
			data: {
				type,
				data: JSON.stringify(data),
				status: 'pending',
				maxAttempts,
			},
		})

		this.emit('jobAdded', job)

		// Start processing if not already running
		if (!this.processing) {
			this.startProcessing()
		}

		return job.id
	}

	// Start processing jobs
	private async startProcessing() {
		this.processing = true
		const pause = () => new Promise(resolve => setTimeout(resolve, 5000))

		while (this.processing) {
			if (this.processingCount >= this.maxConcurrent) {
				await pause()
				continue
			}

			const pendingJob = await this.prisma.job.findFirst({
				where: { status: 'pending' },
				orderBy: { createdAt: 'asc' },
			})

			if (!pendingJob) {
				await pause()
				continue
			}

			this.processJob(pendingJob)
		}
	}

	// Process a single job
	private async processJob(job: JobData) {
		const handler = this.handlers.get(job.type)
		if (!handler) {
			await this.prisma.job.update({
				where: { id: job.id },
				data: {
					status: 'failed',
					error: `No handler registered for job type: ${job.type}`,
				},
			})
			this.emit('jobFailed', job)
			return
		}

		await this.prisma.job.update({
			where: { id: job.id },
			data: {
				status: 'processing',
				attempts: { increment: 1 },
			},
		})

		this.processingCount++

		try {
			await handler(JSON.parse(job.data))

			await this.prisma.job.update({
				where: { id: job.id },
				data: {
					status: 'completed',
				},
			})

			this.emit('jobCompleted', job)
		} catch (error) {
			const updatedJob = await this.prisma.job.update({
				where: { id: job.id },
				data: {
					error: error instanceof Error ? error.message : String(error),
					status: job.attempts >= job.maxAttempts ? 'failed' : 'pending',
				},
			})

			if (updatedJob.status === 'failed') {
				this.emit('jobFailed', updatedJob)
			} else {
				// Exponential backoff
				await new Promise(resolve =>
					setTimeout(resolve, Math.pow(2, job.attempts) * 1000),
				)
			}
		} finally {
			this.processingCount--
		}
	}

	// Get job status
	async getJob(id: string): Promise<JobData | null> {
		return this.prisma.job.findUnique({
			where: { id },
		})
	}

	// Cancel a pending job
	async cancelJob(id: string): Promise<boolean> {
		const job = await this.prisma.job.findUnique({
			where: { id },
		})

		if (job && job.status === 'pending') {
			await this.prisma.job.delete({
				where: { id },
			})
			this.emit('jobCancelled', job)
			return true
		}
		return false
	}

	// Stop processing new jobs
	async stop() {
		this.processing = false
	}

	// Clean up completed/failed jobs older than specified days
	async cleanup(daysToKeep: number) {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

		await this.prisma.job.deleteMany({
			where: {
				AND: [
					{
						status: {
							in: ['completed'],
						},
					},
					{
						updatedAt: {
							lt: cutoffDate,
						},
					},
				],
			},
		})
	}

	// Get queue statistics
	async getStats() {
		const [totalJobs, pendingJobs, processingJobs, completedJobs, failedJobs] =
			await Promise.all([
				this.prisma.job.count(),
				this.prisma.job.count({ where: { status: 'pending' } }),
				this.prisma.job.count({ where: { status: 'processing' } }),
				this.prisma.job.count({ where: { status: 'completed' } }),
				this.prisma.job.count({ where: { status: 'failed' } }),
			])

		return {
			total: totalJobs,
			pending: pendingJobs,
			processing: processingJobs,
			completed: completedJobs,
			failed: failedJobs,
		}
	}
}

// Example usage in your Remix app:
// app/services/queue.server.ts
// import QueueService from './jobs/QueueService'

// const queueService = new QueueService(3)

// // Register handlers
// queueService.registerHandler('emailJob', async data => {
// 	// Email sending logic
// 	console.log('Sending email:', data)
// })

// // Cleanup old jobs every day
// setInterval(
// 	() => {
// 		queueService.cleanup(7) // Keep last 7 days of jobs
// 	},
// 	24 * 60 * 60 * 1000,
// )

// export default queueService
