import { type ActionFunctionArgs, json } from '@remix-run/node'
import { type Fetcher, useFetcher, useFetchers } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { setOrgId } from './cookie.server'

// Preference:
// for app color theme (light or dark).

const path = '/api/preferences/organization'
const Schema = z.object({ organizationId: z.string() })
const validator = withZod(Schema)

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { organizations: { select: { id: true } } },
	})

	if (!user?.organizations.some(org => org.id === data.organizationId)) {
		return validationError({
			fieldErrors: { organizationId: 'Invalid organization' },
		})
	}

	return json({}, { headers: { 'set-cookie': setOrgId(data.organizationId) } })
}

export function useOrgId() {
	const optimisticOrgId = useOptimisticOrgId()
	if (optimisticOrgId) return optimisticOrgId
	return null
}

function useOptimisticOrgId() {
	const fetchers = useFetchers()
	const f = fetchers.find(f => f.formAction === path)
	if (f && f.formData) {
		return f.formData.get('organizationId') as string
	}
}

type Props = {
	children: (params: {
		orgId: string | null
		fetcher: Fetcher
	}) => React.ReactNode
}

export function OrganizationSwitch({ children }: Props) {
	const fetcher = useFetcher<typeof action>()
	const orgId = useOrgId()

	const optimisticOrgId = useOptimisticOrgId()
	const currentOrgId = optimisticOrgId ?? orgId

	return (
		<ValidatedForm
			validator={validator}
			method="POST"
			action={path}
			fetcher={fetcher}
		>
			{children({ orgId: currentOrgId, fetcher })}
		</ValidatedForm>
	)
}
