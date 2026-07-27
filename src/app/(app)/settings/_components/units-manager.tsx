'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { deleteRestaurantUnitAction } from '../actions'
import { addCustomUnitAction } from '../../_actions/units'
import { useT } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Built-in units are a static table in lib/units.ts, not rows — no id, and read-only. */
export type BuiltInUnitDisplay = { value: string; label: string }
export type CustomUnitDisplay = { id: string; label: string }

// One list of every unit the kitchen can pick from, so "what units do we have?" has a
// single answer. Built-ins are shown but not editable: they're a code-level const with
// hand-curated Spanish forms and pluralization, and the values are stored as free text
// on existing items — renaming or deleting one would orphan that data.
export function UnitsManager({
  builtIns,
  custom,
}: {
  builtIns: BuiltInUnitDisplay[]
  custom: CustomUnitDisplay[]
}) {
  const { dict } = useT()
  const [added, setAdded] = useState<CustomUnitDisplay[]>([])
  const allCustom = [...custom, ...added]

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {dict.settings.unitsCustomHeading}
        </h3>
        {allCustom.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.settings.noCustomUnits}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {allCustom.map((u) => (
              <UnitRow key={u.id} id={u.id} label={u.label} />
            ))}
          </ul>
        )}
        <AddUnitRow
          onAdded={(label, id) => setAdded((prev) => [...prev, { id, label }])}
          existing={[...allCustom.map((u) => u.label), ...builtIns.map((b) => b.label)]}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {dict.settings.unitsBuiltInHeading}
        </h3>
        <ul className="flex flex-wrap gap-1.5">
          {builtIns.map((u) => (
            <li
              key={u.value}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground"
            >
              {u.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function AddUnitRow({
  onAdded,
  existing,
}: {
  onAdded: (label: string, id: string) => void
  existing: string[]
}) {
  const { dict } = useT()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    const label = draft.trim()
    if (!label) return
    // Catch the duplicate before a round-trip; the action re-checks server-side.
    if (existing.some((e) => e.toLowerCase() === label.toLowerCase())) {
      setError(dict.errors.settings.unitExists)
      return
    }
    start(async () => {
      const res = await addCustomUnitAction(label)
      if (res.error) {
        setError(res.error)
        return
      }
      // The action revalidates, but the fresh row arrives on the next render — track it
      // locally so the unit appears the moment it's saved.
      onAdded(label, `pending-${label}`)
      setDraft('')
      setError(null)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          placeholder={dict.unitSelect.customPlaceholder}
          aria-label={dict.unitSelect.addUnit}
          aria-invalid={Boolean(error)}
          maxLength={20}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] shrink-0"
          disabled={pending || !draft.trim()}
          onClick={submit}
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
          {dict.settings.addUnit}
        </Button>
      </div>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
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
