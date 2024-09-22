import { json, type LoaderFunctionArgs } from '@remix-run/node'

import { requireUserId } from '#app/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	return json({ userId })
}

export default function GoalsIndex() {
	return <div className="mx-auto">Welcome.</div>
}
