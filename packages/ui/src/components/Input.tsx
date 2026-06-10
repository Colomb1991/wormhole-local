import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'border-input bg-background flex h-12 w-full rounded-md border px-3 py-2 text-base',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...rest}
    />
  )
})
