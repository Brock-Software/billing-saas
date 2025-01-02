import { Link } from '@remix-run/react'

export default function AppIndex() {
	return (
		<div>
			<div className="flex items-center gap-2">
				<Link to="/app/clients">Clients</Link>
				<Link to="/app/invoices" className="text-blue-500 hover:text-blue-600">
					Invoices
				</Link>
			</div>
		</div>
	)
}
