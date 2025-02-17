import { Haptics, ImpactStyle } from '@capacitor/haptics'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { useNavigate } from '@remix-run/react'
import * as React from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import useScrollThreshold from '#app/hooks/useScrollThreshold.js'
import { cn } from '#app/utils/misc'

const ScrollArea = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
		hideScrollbar?: boolean
		orientation?: 'vertical' | 'horizontal'
		showTopBorderOnScroll?: boolean
		topBorderThreshold?: number
		allowPullToRefresh?: boolean
	}
>(
	(
		{
			className,
			hideScrollbar,
			orientation = 'vertical',
			showTopBorderOnScroll,
			topBorderThreshold = 5,
			allowPullToRefresh,
			children,
			...props
		},
		ref,
	) => {
		const navigate = useNavigate()
		const viewportRef = React.useRef<HTMLDivElement>(null)
		const { hasScrolled } = useScrollThreshold({
			ref: viewportRef,
			disabled: !showTopBorderOnScroll,
			threshold: topBorderThreshold,
		})

		return (
			<ScrollAreaPrimitive.Root
				ref={ref}
				className={cn(
					'relative overflow-hidden',
					className,
					hasScrolled && 'border-t',
				)}
				{...props}
			>
				<ScrollAreaPrimitive.Viewport
					className="h-full w-full grow rounded-[inherit] [&>div]:h-full"
					ref={viewportRef}
				>
					{allowPullToRefresh ? (
						<PullToRefresh
							onRefresh={async () =>
								await new Promise(resolve => {
									Haptics.impact({ style: ImpactStyle.Medium })
									navigate('.', { replace: true })
									setTimeout(() => {
										resolve('')
									}, 2000)
								})
							}
						>
							{children as any}
						</PullToRefresh>
					) : (
						children
					)}
				</ScrollAreaPrimitive.Viewport>
				<ScrollBar
					className={hideScrollbar ? 'invisible' : undefined}
					orientation={orientation}
				/>
				<ScrollAreaPrimitive.Corner />
			</ScrollAreaPrimitive.Root>
		)
	},
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		ref={ref}
		orientation={orientation}
		className={cn(
			'flex touch-none select-none transition-colors',
			orientation === 'vertical' &&
				'h-full w-2.5 border-l border-l-transparent p-[1px]',
			orientation === 'horizontal' &&
				'h-2.5 flex-col border-t border-t-transparent p-[1px]',
			className,
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
