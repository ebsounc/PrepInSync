import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Standard page header: an accent-tinted icon chip + bold title. Server component —
// pass the section's lucide icon and the (already-localized) title.
export function PageHeader({
  icon: Icon,
  title,
  className,
}: {
  icon: LucideIcon
  title: string
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex items-center gap-3', className)}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
    </div>
  )
}
