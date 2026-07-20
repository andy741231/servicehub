import * as React from 'react'
import { cva } from 'class-variance-authority'
import { Toggle as TogglePrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const toggleVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-base text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-surface-raised hover:text-text-base focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary-light data-[state=on]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=w-])]:w-4 [&_svg:not([class*=h-])]:h-4',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-border bg-transparent shadow-card-sm hover:bg-surface-raised hover:text-text-base',
      },
      size: {
        default: 'h-9 min-w-9 px-2',
        sm: 'h-8 min-w-8 px-1.5',
        lg: 'h-10 min-w-10 px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({ className, variant, size, ...props }) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
