import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#app/utils/misc'

const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
				success: 'border-transparent bg-green-100 text-green-800',
				'info-outlined': 'border-yellow-300 text-yellow-900 bg-yellow-100',
				outline: 'text-foreground',
			},
			size: {
				default: 'px-2.5 py-0.5 text-sm',
				sm: 'px-1.5 py-0.5 text-xs',
				lg: 'px-3 py-0.5 text-sm',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
	return (
		<div
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

export { Badge, badgeVariants }
