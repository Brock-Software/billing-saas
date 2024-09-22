import { type ActionFunctionArgs, json } from '@remix-run/node'
import { type Fetcher, useFetcher, useFetchers } from '@remix-run/react'
import { withZod } from '@remix-validated-form/with-zod'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { z } from 'zod'
import { type Theme, setTheme } from './cookie.server'

// Preference:
// for app color theme (light or dark).

const path = '/api/preferences/theme'
const Schema = z.object({ theme: z.enum(['light', 'dark']) })
const validator = withZod(Schema)

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const { error, data } = await validator.validate(formData)
	if (error) return validationError(error)
	return json({}, { headers: { 'set-cookie': setTheme(data.theme) } })
}

export function useTheme() {
	const optimisticMode = useOptimisticThemeMode()

	if (optimisticMode) return optimisticMode

	return 'light' as 'light' | 'dark'
}

function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const f = fetchers.find(f => f.formAction === path)
	if (f && f.formData) return 'light' as const
}

type Props = {
	children: (params: { mode: Theme; fetcher: Fetcher }) => React.ReactNode
}

export function ThemeSwitch({ children }: Props) {
	const fetcher = useFetcher<typeof action>()
	const theme = useTheme()

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? theme ?? 'light'

	return (
		<ValidatedForm
			validator={validator}
			method="POST"
			action={path}
			fetcher={fetcher}
		>
			<input type="hidden" name="theme" value="light" />
			{children({ mode, fetcher })}
		</ValidatedForm>
	)
}
