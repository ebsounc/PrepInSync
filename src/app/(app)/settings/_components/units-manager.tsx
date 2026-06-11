'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon, Trash2Icon } from 'lucide-react'
import { deleteRestaurantUnitAction } from '../actions'
import { useT } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'

export function UnitsManager({ units }: { units: { id: string; label: string }[] }) {
  const { dict } = useT()
  if (units.length === 0) {
    return <p className="text-sm text-muted-foreground">{dict.settings.noCustomUnits}</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {units.map((u) => (
        <UnitRow key={u.id} id={u.id} label={u.label} />
      ))}
    </ul>
  )
}

function UnitRow({ id, label }: { id: string; label: string }) {
  const { dict, t } = useT()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <span className="truncate">{label}</span>
      <div className="flex flex-col items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t(dict.settings.removeUnitAria, { label })}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteRestaurantUnitAction(id)
              setError(res.error ?? null)
            })
          }
        >
          {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon className="text-destructive" />}
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </li>
  )
}
