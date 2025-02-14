import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '#app/utils/misc.js'

const input = cva(
	'flex h-9 w-full rounded-md border bg-transparent shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'border-input focus-visible:ring-ring',
				destructive: 'border-destructive focus-visible:ring-destructive',
			},
			size: {
				default: 'h-9 px-3 py-1 text-sm',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

export interface InputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
		VariantProps<typeof input> {
	key?: string
	leftIcon?: React.ReactNode
	rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, leftIcon, rightIcon, type, variant, size, ...props }, ref) => {
		return (
			<div className="relative">
				{leftIcon ? (
					<div className="pointer-events-none absolute inset-y-0 left-4 flex items-center pr-3">
						{leftIcon}
					</div>
				) : null}
				<input
					type={type}
					className={input({
						variant,
						size,
						className: cn(className, rightIcon && 'pr-10', leftIcon && 'pl-11'),
					})}
					ref={ref}
					{...props}
				/>
				{rightIcon ? (
					<div className="absolute inset-y-0 right-2 flex items-center">
						{rightIcon}
					</div>
				) : null}
			</div>
		)
	},
)
Input.displayName = 'Input'

export { Input }
