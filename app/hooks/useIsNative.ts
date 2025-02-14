import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

type Platforms = 'android' | 'ios' | 'web'

export const usePlatform = () => {
	const [platform, setPlatform] = useState<Platforms | undefined>()

	useEffect(() => {
		setPlatform(Capacitor.getPlatform() as Platforms)
	}, [])

	return { platform, isNative: platform === 'android' || platform === 'ios' }
}
