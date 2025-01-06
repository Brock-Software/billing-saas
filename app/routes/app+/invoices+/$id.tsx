import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useLoaderData, Form, useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Button } from '#app/components/ui/button'
import { prisma } from '#app/utils/db.server'
import { getSignedUrl } from '#app/utils/s3.server'
import { redirectWithToast } from '#app/utils/toast.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const invoice = await prisma.invoice.findUnique({
		where: { id: params.id },
		include: {
			client: true,
			timeEntries: true,
		},
	})

	if (!invoice) throw new Response('Not Found', { status: 404 })

	const generateInvoiceJob = await prisma.job.findFirst({
		where: {
			type: 'upsert-invoice-pdf',
			data: { contains: invoice.id },
		},
		orderBy: { createdAt: 'desc' },
	})

	return json({ invoice, generateInvoiceJob })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 're-generate-invoice': {
			await prisma.job.create({
				data: {
					type: 'upsert-invoice-pdf',
					data: JSON.stringify({ invoiceId: params.id, regenerated: true }),
				},
			})
			return redirectWithToast(`/app/invoices/${params.id}`, {
				title: 'Invoice queued',
				description: 'Invoice will be processed shortly',
			})
		}
		case 'send-invoice-email': {
			await prisma.job.create({
				data: {
					type: 'send-invoice-email',
					data: JSON.stringify({ invoiceId: params.id }),
				},
			})
			return redirectWithToast(`/app/invoices/${params.id}`, {
				title: 'Invoice queued',
				description: 'Invoice will be sent shortly',
			})
		}
		case 'mark-sent': {
			await prisma.invoice.update({
				where: { id: params.id },
				data: { sentAt: new Date() },
			})
			return redirectWithToast(`/app/invoices/${params.id}`, {
				title: 'Invoice marked as sent',
				description: 'Invoice has been marked as sent',
			})
		}
		case 'mark-paid': {
			await prisma.invoice.update({
				where: { id: params.id },
				data: { paidAt: new Date() },
			})
			return redirectWithToast(`/app/invoices/${params.id}`, {
				title: 'Invoice paid',
				description: 'Invoice has been marked as paid',
			})
		}
		case 'get-download-url': {
			const signedUrl = await getSignedUrl(`invoices/${params.id}.pdf`, 3600)
			return json({ signedUrl })
		}
	}
}

export default function Id() {
	const { invoice, generateInvoiceJob } = useLoaderData<typeof loader>()
	const fetcher = useFetcher<{ signedUrl: string }>()
	const [showCopied, setShowCopied] = useState(false)

	const downloadInvoice = async () => {
		const data = new FormData()
		data.append('intent', 'get-download-url')
		fetcher.submit(data, { method: 'POST' })
	}

	useEffect(() => {
		if (fetcher.data?.signedUrl) {
			window.open(fetcher.data.signedUrl, '_blank')
		}
	}, [fetcher.data?.signedUrl])

	const handleCopy = () => {
		navigator.clipboard.writeText(`Hi,

I hope this email finds you well. Please find attached the invoice for recent services provided.

Invoice Details:
- Invoice Number: ${invoice.number}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Please let me know if you have any questions or concerns.

Thank you for your business!

Best regards,`)
		setShowCopied(true)
		setTimeout(() => setShowCopied(false), 3000)
	}

	if (invoice.paidAt) {
		return (
			<div className="py-12 text-center">
				<h1 className="text-3xl font-bold text-green-600">Invoice Paid! 🎉</h1>
				<p className="mt-2 text-gray-600">
					Payment received on {new Date(invoice.paidAt).toLocaleDateString()}
				</p>
			</div>
		)
	}

	if (invoice.sentAt) {
		return (
			<div className="py-12 text-center">
				<h1 className="mb-4 text-2xl font-semibold">Invoice Sent</h1>
				<p className="mb-6 text-gray-600">
					Invoice was sent to {invoice.client.email}
				</p>
				<Form method="post">
					<Button variant="outline" name="intent" value="mark-paid">
						Record Payment
					</Button>
				</Form>
			</div>
		)
	}

	if (generateInvoiceJob) {
		if (
			generateInvoiceJob.status === 'pending' ||
			generateInvoiceJob.status === 'processing'
		) {
			return (
				<div className="py-12 text-center">
					<h1 className="mb-4 text-2xl font-semibold">Generating invoice...</h1>
					<p className="text-gray-600">
						The invoice is being processed and will be available to send
						shortly.
					</p>
				</div>
			)
		} else if (generateInvoiceJob.status === 'failed') {
			return (
				<div className="py-12 text-center">
					<h1 className="mb-4 text-2xl font-semibold">
						Invoice failed to generate.
					</h1>
					<p className="text-gray-600">
						Please try again by clicking the button below.
					</p>
				</div>
			)
		}
	}

	return (
		<div className="py-12 text-center">
			<h1 className="mb-4 text-2xl font-semibold">Ready to Send</h1>
			<p className="mb-6 text-gray-600">
				Invoice will be sent to {invoice.client.email}
			</p>
			<div className="space-y-8">
				<div className="flex justify-center gap-4">
					<Button name="intent" onClick={downloadInvoice}>
						Download Invoice
					</Button>
					<Form method="post" className="flex gap-4">
						<Button name="intent" value="re-generate-invoice" variant="outline">
							Re-generate Invoice
						</Button>
						<Button name="intent" value="mark-sent" variant="outline">
							Mark as Sent
						</Button>
					</Form>
				</div>

				<div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
					<h2 className="mb-4 font-semibold">Email Template</h2>
					<div className="rounded bg-white p-4">
						<pre className="whitespace-pre-wrap text-sm text-gray-700">
							{`Hi,

I hope this email finds you well. Please find attached the invoice for recent services provided.

Invoice Details:
- Invoice Number: ${invoice.number}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Please let me know if you have any questions or concerns.

Thank you for your business!

Best regards,`}
						</pre>
					</div>
					<div className="relative">
						<Button
							variant="outline"
							className="mt-2 w-full"
							onClick={handleCopy}
						>
							{showCopied ? 'Copied!' : 'Copy to Clipboard'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
