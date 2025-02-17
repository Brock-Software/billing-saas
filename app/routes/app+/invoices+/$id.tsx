import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useLoaderData, Form, useFetcher } from '@remix-run/react'
import { Copy, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import Stripe from 'stripe'
import { Button } from '#app/components/ui/button'
import { decryptData } from '#app/utils/crypto.server.ts'
import { prisma } from '#app/utils/db.server'
import { getInvoiceAmount } from '#app/utils/get-invoice-amount.ts'
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
		case 'create-payment-link': {
			const invoice = await prisma.invoice.findUnique({
				where: { id: params.id },
				include: {
					client: { include: { organization: true } },
					timeEntries: true,
				},
			})
			if (!invoice) throw new Response('Not Found', { status: 404 })
			else if (!invoice.client.stripeCustomerId)
				throw new Response('Client has no Stripe customer ID', { status: 400 })
			else if (!invoice.client.organization.stripeKeyHash)
				throw new Response('Organization has no Stripe key hash', {
					status: 400,
				})

			const { total } = await getInvoiceAmount(invoice)

			const stripe = new Stripe(
				decryptData(
					invoice.client.organization.stripeKeyHash,
					process.env.ENCRYPTION_KEY!,
				),
			)

			const price = await stripe.prices.create({
				currency: 'usd',
				product_data: {
					name: 'Payment for Invoice #' + invoice.number,
				},
				unit_amount: total * 100,
			})

			const session = await stripe.checkout.sessions.create({
				customer: invoice.client.stripeCustomerId,
				line_items: [
					{
						price: price.id,
						quantity: 1,
					},
				],
				mode: 'payment',
				payment_method_types: ['us_bank_account'],
				success_url: process.env.STRIPE_SUCCESS_URL,
				cancel_url: process.env.STRIPE_CANCEL_URL,
			})

			await prisma.invoice.update({
				where: { id: params.id },
				data: { stripePaymentLink: session.url },
			})

			return json({ link: session.url })
		}
	}
}

export default function Id() {
	const { invoice, generateInvoiceJob } = useLoaderData<typeof loader>()
	const fetcher = useFetcher<{ signedUrl: string; link: string }>()
	const [showCopied, setShowCopied] = useState(false)
	const [showCopiedLink, setShowCopiedLink] = useState(false)
	const [link, setLink] = useState<string | null>(invoice.stripePaymentLink)

	const downloadInvoice = async () => {
		const data = new FormData()
		data.append('intent', 'get-download-url')
		fetcher.submit(data, { method: 'POST' })
	}

	const createPaymentLink = async () => {
		const data = new FormData()
		data.append('intent', 'create-payment-link')
		fetcher.submit(data, { method: 'POST' })
	}

	useEffect(() => {
		if (fetcher.data?.signedUrl) {
			window.open(fetcher.data.signedUrl, '_blank')
		} else if (fetcher.data?.link) {
			setLink(fetcher.data.link)
		}
	}, [fetcher.data])

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
						{invoice.paidAt ? null : invoice.sentAt ? (
							<Button name="intent" value="mark-paid" variant="outline">
								Record Payment
							</Button>
						) : (
							<Button name="intent" value="mark-sent" variant="outline">
								Mark as Sent
							</Button>
						)}
					</Form>
					{invoice.client.stripeCustomerId && !link ? (
						<Button variant="outline" onClick={createPaymentLink}>
							Create Payment Link
						</Button>
					) : null}
				</div>
				{link ? (
					<div
						className="mx-auto flex max-w-fit cursor-pointer items-center gap-2 rounded-md bg-primary/10 px-3 py-2 transition-colors hover:bg-primary/20"
						onClick={() => {
							navigator.clipboard.writeText(link)
							setShowCopiedLink(true)
							setTimeout(() => setShowCopiedLink(false), 2000)
						}}
					>
						<span className="max-w-[400px] truncate">{link}</span>
						{showCopiedLink ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</div>
				) : null}

				{invoice.paidAt ? (
					<div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
						<h2 className="mb-4 font-semibold">Invoice Paid</h2>
						<p className="text-gray-600">
							Payment received on{' '}
							{new Date(invoice.paidAt).toLocaleDateString()}
						</p>
					</div>
				) : invoice.sentAt ? (
					<div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
						<h2 className="mb-4 font-semibold">Invoice Sent</h2>
						<p className="text-gray-600">
							Invoice was sent to {invoice.client.email}
						</p>
					</div>
				) : (
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
				)}
			</div>
		</div>
	)
}
