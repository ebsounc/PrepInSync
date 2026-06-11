'use client'

import { useState, useTransition } from 'react'
import { XIcon, PlusIcon, Loader2Icon } from 'lucide-react'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UNITS } from '@/lib/units'
import { useT } from '@/lib/i18n/client'

const ADD_SENTINEL = '__add_unit__'

// Controlled unit picker. Renders a hidden input so the value submits with the
// surrounding <form> (base-ui Select doesn't post a native form value on its own).
// Shows built-in units plus the restaurant's custom units; optionally lets the user
// add a new custom unit inline (onAddUnit) and clear an optional selection.
export function UnitSelect({
  name,
  value,
  onValueChange,
  placeholder,
  customUnits = [],
  clearable = false,
  onAddUnit,
}: {
  name: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  customUnits?: string[]
  clearable?: boolean
  onAddUnit?: (label: string) => Promise<{ error?: string }>
}) {
  const { dict } = useT()
  const placeholderText = placeholder ?? dict.unitSelect.placeholder
  // Units added during this session show immediately without waiting on a refetch.
  const [sessionUnits, setSessionUnits] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const allCustom = Array.from(new Set([...customUnits, ...sessionUnits]))

  function handleChange(v: string) {
    if (v === ADD_SENTINEL) {
      setAdding(true)
      return
    }
    onValueChange(v)
  }

  function submitNewUnit() {
    const label = draft.trim()
    if (!label || !onAddUnit) return
    start(async () => {
      const res = await onAddUnit(label)
      if (res.error) {
        setError(res.error)
        return
      }
      setSessionUnits((u) => (u.includes(label) ? u : [...u, label]))
      onValueChange(label)
      setDraft('')
      setError(null)
      setAdding(false)
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <SelectField value={value} onValueChange={(v) => handleChange(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder={placeholderText} />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
            {allCustom.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
            {onAddUnit && (
              <SelectItem value={ADD_SENTINEL}>
                <span className="flex items-center gap-1.5 text-primary">
                  <PlusIcon className="size-4" /> {dict.unitSelect.addUnit}
                </span>
              </SelectItem>
            )}
          </SelectContent>
        </SelectField>
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label={dict.unitSelect.clearUnit}
            onClick={() => onValueChange('')}
          >
            <XIcon />
          </Button>
        )}
      </div>

      {adding && onAddUnit && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={dict.unitSelect.customPlaceholder}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitNewUnit()
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="size-11 shrink-0"
              aria-label={dict.unitSelect.saveUnit}
              disabled={pending || !draft.trim()}
              onClick={submitNewUnit}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={dict.common.cancel}
              onClick={() => {
                setAdding(false)
                setDraft('')
                setError(null)
              }}
            >
              <XIcon />
            </Button>
          </div>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      )}

      <input type="hidden" name={name} value={value} />
    </>
  )
}
