import { redirect } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '#app/components/ui/button.js'
import { useOptionalUser } from '#app/hooks/useUser.js'

export async function loader() {
	return redirect('/app')
}

export default function GoalsIndex() {
	const user = useOptionalUser()

	return (
		<div className="mx-auto flex min-h-screen max-w-screen-lg flex-col">
			<nav className="flex items-center justify-between p-2 md:p-4">
				<Link to="/">
					<h2 className="opacity-75">billing-saas</h2>
				</Link>
				{user ? (
					<Button asChild className="h-9 rounded-full px-4">
						<Link to="/app">
							Dashboard <ArrowRightIcon className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				) : (
					<Button asChild className="h-9 rounded-full px-4">
						<Link to="/app">
							Sign in <ArrowRightIcon className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				)}
			</nav>
			<section className="mt-16 flex-grow text-center">
				<h1 className="text-6xl font-extrabold tracking-tight text-gray-900 sm:text-8xl">
					Get. Stuff. Done.
				</h1>
				<p className="mx-auto mt-6 max-w-md px-4 text-xl text-gray-600">
					Break down massive projects into manageable steps. Build cathedrals,
					cities, and lasting legacies—one task at a time.
				</p>
			</section>
			<footer className="mt-auto border-t border-gray-200 py-8">
				<div className="mx-auto max-w-4xl px-4">
					<div className="flex flex-col items-start justify-between md:flex-row">
						<div className="mb-6 md:mb-0">
							<h3 className="mb-2 text-lg font-semibold">billing-saas</h3>
							<p className="text-sm text-gray-600">
								&copy; {new Date().getFullYear()} Brock Software. All rights
								reserved.
							</p>
						</div>
						<div className="flex space-x-8">
							<div className="flex flex-col space-y-2">
								<Link
									to="/about"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									About
								</Link>
								<Link
									to="/contact"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									Contact
								</Link>
								<Link
									to="/app"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									Sign In
								</Link>
							</div>
							<div className="flex flex-col space-y-2">
								<Link
									to="/privacy"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									Privacy Policy
								</Link>
								<Link
									to="/terms"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									Terms of Service
								</Link>
								<Link
									to="/faq"
									className="text-sm text-gray-600 hover:text-gray-900"
								>
									FAQ
								</Link>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
