import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { getOrgId } from '#app/routes/api+/preferences+/organization/cookie.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const invoices = await prisma.invoice.findMany({
		include: {
			client: true,
			timeEntries: {
				select: {
					hourlyRate: true,
					startTime: true,
					endTime: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		where: { client: { orgId: getOrgId(request)! } },
	})

	return json({ invoices })
}

function getInvoiceStatus(invoice: {
	paidAt: Date | null
	sentAt: Date | null
	dueDate: Date
}) {
	if (invoice.paidAt) return 'PAID'
	if (invoice.sentAt) {
		return new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'SENT'
	}
	return 'DRAFT'
}

function calculateInvoiceAmount(
	entries: Array<{
		hourlyRate: string | null
		startTime: string
		endTime: string | null
	}>,
) {
	return entries.reduce((total, entry) => {
		if (!entry.hourlyRate || !entry.endTime) return total
		const duration =
			(new Date(entry.endTime).getTime() -
				new Date(entry.startTime).getTime()) /
			1000 /
			60 /
			60
		return total + Number(entry.hourlyRate) * duration
	}, 0)
}

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount)
}

export default function InvoicesIndex() {
	const { invoices } = useLoaderData<typeof loader>()

	return (
		<div className="p-6">
			<h1 className="mb-6 text-2xl font-bold">Invoices</h1>
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b">
							<th className="py-2 text-left">Invoice #</th>
							<th className="py-2 text-left">Client</th>
							<th className="py-2 text-left">Amount</th>
							<th className="py-2 text-left">Status</th>
							<th className="py-2 text-left">Created Date</th>
							<th className="py-2 text-left">Sent Date</th>
							<th className="py-2 text-left">Paid Date</th>
						</tr>
					</thead>
					<tbody>
						{invoices.map(invoice => {
							const status = getInvoiceStatus({
								paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
								sentAt: invoice.sentAt ? new Date(invoice.sentAt) : null,
								dueDate: new Date(invoice.dueDate),
							})
							const amount = calculateInvoiceAmount(invoice.timeEntries)

							return (
								<tr key={invoice.id} className="border-b hover:bg-gray-50">
									<td className="py-2">
										<Link
											to={`/app/invoices/${invoice.id}`}
											className="text-blue-500 hover:text-blue-600"
										>
											{invoice.number}
										</Link>
									</td>
									<td className="py-2">{invoice.client.name}</td>
									<td className="py-2">{formatCurrency(amount)}</td>
									<td className="py-2">
										<span
											className={`rounded px-2 py-1 text-sm ${
												status === 'PAID'
													? 'bg-green-100 text-green-800'
													: status === 'SENT'
														? 'bg-blue-100 text-blue-800'
														: status === 'OVERDUE'
															? 'bg-red-100 text-red-800'
															: 'bg-gray-100 text-gray-800'
											}`}
										>
											{status.toLowerCase()}
										</span>
									</td>
									<td className="py-2">
										{new Date(invoice.createdAt).toLocaleDateString()}
									</td>
									<td className="py-2">
										{invoice.sentAt
											? new Date(invoice.sentAt).toLocaleDateString()
											: 'N/A'}
									</td>
									<td className="py-2">
										{invoice.paidAt
											? new Date(invoice.paidAt).toLocaleDateString()
											: 'N/A'}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}
