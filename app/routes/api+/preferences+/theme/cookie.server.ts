import * as cookie from 'cookie'

const cookieName = 'theme'
export type Theme = 'light' | 'dark'

export function getTheme(): Theme | null {
	return 'light'
}

export function setTheme(theme: Theme | 'system') {
	return cookie.serialize(cookieName, theme, { path: '/', maxAge: 31536000 })
}
