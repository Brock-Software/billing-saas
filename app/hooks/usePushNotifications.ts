/* eslint-disable no-console */
import { Capacitor } from '@capacitor/core'
import {
	PushNotifications,
	type Token,
	type PushNotificationSchema,
	type ActionPerformed,
} from '@capacitor/push-notifications'
import { useFetcher, useNavigate } from '@remix-run/react'
import { useEffect } from 'react'
import { useUser } from './useUser'

export const usePushNotifications = () => {
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const user = useUser()

	useEffect(() => {
		const registerForNotifications = () => {
			PushNotifications.register()

			PushNotifications.addListener('registration', (token: Token) => {
				// eslint-disable-next-line no-console
				console.log('Push registration success', token)
				if (user.deviceToken === token.value) return
				fetcher.submit(
					{ deviceToken: token.value },
					{ method: 'POST', action: `/api/model/user/${user.id}` },
				)
			})

			PushNotifications.addListener('registrationError', (error: any) => {
				// eslint-disable-next-line no-console
				console.error('Error on registration: ', error)
			})

			PushNotifications.addListener(
				'pushNotificationReceived',
				(notification: PushNotificationSchema) => {
					// eslint-disable-next-line no-console
					console.log(notification)
				},
			)

			// Remove Delivered Notifications to clean badge count
			setTimeout(() => {
				PushNotifications.removeAllDeliveredNotifications()
					.then(() => {
						// eslint-disable-next-line no-console
						console.log('Delivered Notifications successfully removed')
					})
					.catch(err => {
						// eslint-disable-next-line no-console
						console.error('Error removing delivered notifications', err)
					})
			}, 2000)

			// Method called when tapping on a notification
			PushNotifications.addListener(
				'pushNotificationActionPerformed',
				(notification: ActionPerformed) => {
					const path = notification?.notification.data.url
					if (path) navigate(path)
				},
			)
		}

		if (Capacitor.isPluginAvailable('PushNotifications')) {
			PushNotifications.addListener(
				'pushNotificationReceived',
				(notification: PushNotificationSchema) => {
					// eslint-disable-next-line no-console
					console.log(notification)
				},
			)
		}

		PushNotifications.checkPermissions().then(res => {
			if (res.receive !== 'granted') {
				PushNotifications.requestPermissions().then(res => {
					if (res.receive === 'denied') {
						// eslint-disable-next-line no-console
						console.error('Push Notification permission denied')
					} else {
						// eslint-disable-next-line no-console
						console.log('Push Notification permission granted', res)
						registerForNotifications()
					}
				})
			} else {
				registerForNotifications()
			}
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
}
