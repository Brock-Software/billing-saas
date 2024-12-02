import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useLoaderData, Form } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { Button } from '#app/components/ui/button'
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

	const job = await prisma.job.findFirst({
		where: {
			type: 'send-invoice',
			data: { contains: invoice.id },
		},
		orderBy: { createdAt: 'desc' },
	})

	return json({ invoice, job })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 'send': {
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
	}
}

export default function Id() {
	const { invoice, job } = useLoaderData<typeof loader>()

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

	if (!invoice.sentAt && !job) {
		return (
			<div className="py-12 text-center">
				<h1 className="mb-4 text-2xl font-semibold">Ready to Send Invoice</h1>
				<Form method="post">
					<Button name="intent" value="send">
						Send Invoice
					</Button>
				</Form>
			</div>
		)
	}

	if (job?.status === 'pending' || job?.status === 'processing') {
		return (
			<div className="py-12 text-center">
				<h1 className="mb-4 text-2xl font-semibold">Sending Invoice...</h1>
				<p className="text-gray-600">
					The invoice is being processed and will be sent shortly.
				</p>
			</div>
		)
	}

	return (
		<div className="py-12 text-center">
			<h1 className="mb-4 text-2xl font-semibold">Invoice Sent</h1>
			<p className="mb-6 text-gray-600">
				Invoice was sent to {invoice.client.email}
			</p>
			<Form method="post">
				<Button name="intent" value="mark-paid">
					Record Payment
				</Button>
			</Form>
		</div>
	)
}
