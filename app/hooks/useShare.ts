import { Share } from '@capacitor/share'

export const useShare =
	({ appStoreUrl }: { appStoreUrl?: string }) =>
	async () => {
		try {
			await Share.share({
				title: 'Rally Invitation',
				text: 'You are invited to rally! Click the link below and download the app',
				url: appStoreUrl ?? 'https://letsrally.life',
				dialogTitle: 'Invite Friends',
			})
		} catch (error) {
			throw new Error('Failed to share')
		}
	}
