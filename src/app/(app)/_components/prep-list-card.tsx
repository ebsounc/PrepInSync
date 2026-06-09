import Link from 'next/link'
import { CheckCircle2Icon, CircleIcon, StarIcon } from 'lucide-react'
import type { PrepListDisplay, PrepListEntryDisplay } from '@/lib/translation/apply'
import { formatListDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PrepListCard({
  list,
  entries,
}: {
  list: PrepListDisplay
  entries?: PrepListEntryDisplay[]
}) {
  const pct = list.total > 0 ? Math.round((list.done / list.total) * 100) : 0
  const complete = list.total > 0 && list.done === list.total
  return (
    <Link
      href={`/prep-lists/${list.id}`}
      className="block min-h-[44px] rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          {complete && <CheckCircle2Icon className="size-4 shrink-0 text-primary" />}
          <span className="truncate">{list.titleDisplay}</span>
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">{formatListDate(list.date)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {list.done}/{list.total}
        </span>
      </div>

      {/* Read-only preview of the items and what's done so far. */}
      {entries && entries.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t pt-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              {e.completed ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
              ) : (
                <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              {e.isStarred && <StarIcon className="size-3 shrink-0 fill-current text-amber-500" />}
              <span className={cn('truncate', e.completed && 'text-muted-foreground line-through')}>
                {e.itemNameDisplay}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
