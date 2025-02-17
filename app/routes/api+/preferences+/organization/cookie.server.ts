import * as cookie from 'cookie'

const cookieName = 'organizationId'

export function getOrgId(request: Request): string | null {
	const cookieHeader = request.headers.get('cookie')
	const parsed = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : null
	return parsed
}

export function setOrgId(orgId: string) {
	return cookie.serialize(cookieName, orgId, {
		path: '/',
		maxAge: 31536000, // 1 year
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	})
}

export function clearOrgId() {
	return cookie.serialize(cookieName, '', {
		path: '/',
	})
}
