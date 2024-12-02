import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Resend } from 'resend'

export interface SendInvoiceEmailPayload {
	fromName: string
	fromEmail: string
	to: string
	subject: string
	body: string
	bcc?: string[]
	cc?: string[]
	invoiceId: string
}

const resend = new Resend(process.env.RESEND_API_KEY)
const s3Client = new S3Client()

const getS3File = async (key: string) => {
	const params = { Bucket: 'billing-saas-uploads', Key: key }
	const { Body } = await s3Client.send(new GetObjectCommand(params))
	const content = Body
		? Buffer.from(await Body.transformToByteArray())
		: Buffer.from('')

	return {
		content,
		contentType: 'application/pdf',
		filename: key.split('/')[1],
	}
}

export async function sendInvoiceEmail(data: SendInvoiceEmailPayload) {
	const invoicePdf = await getS3File(`invoices/${data.invoiceId}.pdf`)

	await resend.emails.send({
		from: `${data.fromName} <${data.fromEmail}>`,
		to: data.to,
		bcc: data.bcc,
		cc: data.cc,
		subject: data.subject,
		html: data.body,
		attachments: [invoicePdf],
	})
}
