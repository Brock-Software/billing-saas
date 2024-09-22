import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '#app/utils/misc'

const buttonVariants = cva(
	'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground shadow hover:bg-primary/90',
				destructive:
					'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
				outline:
					'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
				secondary:
					'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-2 hover:underline',
			},
			size: {
				default: 'h-8 px-2',
				sm: 'h-7 rounded-sm px-1 text-xs',
				lg: 'h-9 rounded-md px-4',
				icon: 'h-8 w-8 rounded-full',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
	isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ isLoading, className, variant, size, asChild = false, ...props }, ref) => {
		return asChild ? (
			<Slot
				className={cn(buttonVariants({ variant, size }), className)}
				ref={ref}
				disabled={isLoading}
				{...props}
			/>
		) : (
			<button
				className={cn(buttonVariants({ variant, size }), className)}
				ref={ref}
				disabled={isLoading}
				{...props}
			>
				<>
					{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
					{props.children}
				</>
			</button>
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonVariants }
