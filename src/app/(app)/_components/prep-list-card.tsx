import Link from 'next/link'
import type { PrepListWithProgress } from '@/lib/db/queries/prep-lists'

export function PrepListCard({ list }: { list: PrepListWithProgress }) {
  const pct = list.total > 0 ? Math.round((list.done / list.total) * 100) : 0
  return (
    <Link
      href={`/prep-lists/${list.id}`}
      className="block min-h-[44px] rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{list.title}</span>
        <span className="shrink-0 text-sm text-muted-foreground">{list.date}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {list.done}/{list.total}
        </span>
      </div>
    </Link>
  )
}
