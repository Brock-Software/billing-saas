import { type CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'your.apple.id',
	appName: 'forgetyourbudget',
	webDir: 'build-mobile',
	server: {
		url: 'http://localhost:3000',
		allowNavigation: [
			'yourdomain.com',
			'*.yourdomain.com',
			'forgetyourbudget.fly.dev',
			'forgetyourbudget-staging.fly.dev',
		],
	},
	ios: { limitsNavigationsToAppBoundDomains: false },
	plugins: {
		PushNotifications: {
			presentationOptions: ['badge', 'sound', 'alert'],
		},
		SplashScreen: {
			launchShowDuration: 2500,
		},
		CapacitorCookies: {
			enabled: true,
		},
	},
}

export default config
