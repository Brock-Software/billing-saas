import fs from 'fs'
import path from 'path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'
import Mustache from 'mustache'
import puppeteer from 'puppeteer-core'

export interface CreateInvoicePdfPayload {
	invoiceId: string
}

const s3Client = new S3Client()
const prisma = new PrismaClient()

const getHtmlTemplate = (filePath: string): string => {
	const fullPath = path.resolve(process.cwd(), filePath)
	return fs.readFileSync(fullPath, 'utf-8')
}

const generatePDF = async ({
	bodyHtml,
	footerHtml,
	headerHtml,
}: {
	bodyHtml: string
	footerHtml: string
	headerHtml: string
}) => {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
		headless: true,
	})

	const page = await browser.newPage()
	await page.setContent(bodyHtml)
	await page.emulateMediaType('print')

	const pdfBuffer = await page.pdf({
		displayHeaderFooter: true,
		footerTemplate: footerHtml,
		format: 'A4',
		headerTemplate: headerHtml,
	})

	await browser.close()

	return pdfBuffer
}

export async function createInvoicePdf(data: CreateInvoicePdfPayload) {
	const invoice = await prisma.invoice.findUniqueOrThrow({
		where: { id: data.invoiceId },
		include: { timeEntries: true, client: true },
	})

	const subtotal = invoice.timeEntries.reduce((sum, entry) => {
		const hours = entry.endTime
			? (new Date(entry.endTime).getTime() -
					new Date(entry.startTime).getTime()) /
				(1000 * 60 * 60)
			: 0
		const rate = entry.hourlyRate || invoice.client.hourlyRate || 0
		return sum + hours * Number(rate)
	}, 0)

	const taxAmount = invoice.tax ? subtotal * Number(invoice.tax) : 0
	const total = subtotal + taxAmount - (Number(invoice.discount) || 0)

	const bodyHtml = Mustache.render(
		getHtmlTemplate('workers/queue-service-utils/create-invoice-pdf/body.html'),
		{
			invoice: {
				...invoice,
				createdAt: invoice.createdAt.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				}),
				dueDate: invoice.dueDate.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				}),
				subtotal,
				taxAmount,
				total,
			},
		},
	)
	const headerHtml = Mustache.render(
		getHtmlTemplate(
			'workers/queue-service-utils/create-invoice-pdf/header.html',
		),
		{ invoice },
	)

	const buffer = await generatePDF({
		headerHtml,
		bodyHtml,
		footerHtml: `
			<div style="text-align: right;width: 297mm;font-size: 8px;">
				<span style="margin-right: 1cm">
					<span class="pageNumber"></span> of <span class="totalPages"></span>
				</span>
			</div>
		`,
	})

	const params = {
		Body: buffer,
		Bucket: 'billing-saas-uploads',
		ContentType: 'application/pdf',
		Key: `invoices/${data.invoiceId}.pdf`,
	}

	await s3Client.send(new PutObjectCommand(params))
}
