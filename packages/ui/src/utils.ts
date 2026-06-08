import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina classi Tailwind con risoluzione conflitti.
 * Pattern shadcn/ui standard.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
