import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Accessible toolbar wrapper. shadcn/ui v4 does not ship a dedicated Toolbar
 * component (they compose ToggleGroup + Separator inside a styled div), so this
 * thin wrapper adds the ARIA `role="toolbar"` + `aria-label` + `aria-orientation`
 * semantics and the project's surface styling.
 *
 * Usage:
 *   <Toolbar aria-label="Text formatting">
 *     <ToggleGroup type="single" ...>...</ToggleGroup>
 *     <Separator orientation="vertical" className="h-5 mx-1" />
 *     <ToggleGroup type="multiple" ...>...</ToggleGroup>
 *   </Toolbar>
 */
const Toolbar = React.forwardRef(
  ({ className, orientation = 'horizontal', 'aria-label': ariaLabel, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1.5 bg-surface/95 backdrop-blur-sm border border-border rounded-lg shadow-dropdown p-1.5',
        orientation === 'vertical' && 'flex-col',
        className,
      )}
      {...props}
    />
  ),
)
Toolbar.displayName = 'Toolbar'

export { Toolbar }
