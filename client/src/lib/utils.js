import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names with conflict resolution.
 * Used by shadcn/ui-style components in src/components/ui/.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
