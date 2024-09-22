import { useState, useEffect } from 'react'

interface Params {
	ref: React.RefObject<HTMLDivElement>
	threshold?: number
	disabled?: boolean
}

function useScrollThreshold({ ref, threshold = 0, disabled = false }: Params) {
	const [hasScrolled, setHasScrolled] = useState(false)

	useEffect(() => {
		if (disabled) return
		const div = ref.current

		const handleScroll = () => {
			const isScrolled = div ? div.scrollTop > threshold : false
			setHasScrolled(isScrolled)
		}

		div?.addEventListener('scroll', handleScroll)

		return () => {
			div?.removeEventListener('scroll', handleScroll)
		}
	}, [threshold, disabled, ref])

	return { hasScrolled }
}

export default useScrollThreshold
