import { Link, Outlet, useLocation } from '@remix-run/react'
import capitalize from 'lodash/capitalize'
import { Settings } from 'lucide-react'
import { Button } from '#app/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.js'
import { useUser } from '#app/hooks/useUser.js'

export default function AuthLayout() {
	const user = useUser()
	const location = useLocation()

	const pathSegments = location.pathname.split('/').filter(Boolean).slice(1, -1)
	const breadcrumbs = pathSegments.map((segment, index) => {
		const url = `/app/${pathSegments.slice(0, index + 1).join('/')}`
		const isId = !isNaN(Number(segment))

		return isId ? (
			<span key={segment} className="text-gray-500">
				{segment}
			</span>
		) : (
			<Button key={segment} variant="ghost" className="font-bold" asChild>
				<Link to={url}>{capitalize(segment)}</Link>
			</Button>
		)
	})

	return (
		<div className="min-h-screen bg-stone-50">
			<div className="mx-auto flex min-h-screen max-w-screen-xl flex-col">
				<nav className="flex items-center justify-between p-4">
					<div className="flex items-center">
						<Link to="/app">
							<p className="font-bold opacity-75">billing-saas</p>
						</Link>
						{breadcrumbs.length ? (
							<>
								<span className="ml-2">/</span>
								{breadcrumbs}
							</>
						) : null}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<Settings className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{user ? (
								<>
									<DropdownMenuItem asChild>
										<Link to="/app/profile">Account</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<form action="/auth/logout" method="POST">
											<button type="submit" className="w-full text-left">
												Logout
											</button>
										</form>
									</DropdownMenuItem>
								</>
							) : (
								<DropdownMenuItem asChild>
									<Link to="/auth/login">Sign In</Link>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</nav>
				<main className="flex-1 p-4">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
