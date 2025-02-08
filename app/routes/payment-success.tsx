export default function PaymentSuccess() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-md space-y-8 text-center">
				<div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 py-4">
					<svg
						className="h-12 w-12 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
					Payment Successful!
				</h2>
				<p className="mt-2 text-sm text-gray-600">
					Thank you for your payment. The invoice has been marked as paid.
				</p>
			</div>
		</div>
	)
}
