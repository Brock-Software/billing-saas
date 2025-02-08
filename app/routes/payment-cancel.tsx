export default function PaymentCancel() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-md space-y-8 text-center">
				<div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 py-4">
					<svg
						className="h-12 w-12 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
					Payment Cancelled
				</h2>
				<p className="mt-2 text-sm text-gray-600">
					Your payment was not completed. If you continue to experience issues,
					please contact the business directly.
				</p>
			</div>
		</div>
	)
}
