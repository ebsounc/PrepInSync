import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

// The PrepInSync mark: an outline clipboard with a check. Colored from the active
// accent (--primary) so it follows the user's chosen color; the check is a darker
// shade derived at render time. Size it via className (e.g. "size-7").
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="PrepInSync"
      {...props}
    >
      <rect x="24" y="22" width="52" height="62" rx="12" fill="none" stroke="var(--primary)" strokeWidth={7} />
      <rect x="40" y="15" width="20" height="12" rx="4" fill="var(--primary)" />
      <path
        d="M35 52 L45 62 L65 39"
        fill="none"
        stroke="color-mix(in oklch, var(--primary), #000 30%)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
