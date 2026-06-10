import type { CSSProperties, ReactNode } from 'react'

/**
 * Applica il tema del tenant (brand color) come CSS variables, ereditate da
 * tutte le utility Tailwind `*-primary` / `*-ring` dei figli.
 */
export function TenantTheme({
  brandColor,
  children,
  className,
}: {
  brandColor?: string | null
  children: ReactNode
  className?: string
}) {
  const style = brandColor
    ? ({ '--color-primary': brandColor, '--color-ring': brandColor } as CSSProperties)
    : undefined

  return (
    <div style={style} className={className}>
      {children}
    </div>
  )
}
