'use client'

import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { UNITS } from '@/lib/units'

// Controlled unit picker. Renders a hidden input so the value submits with the
// surrounding <form> (base-ui Select doesn't post a native form value on its own).
export function UnitSelect({
  name,
  value,
  onValueChange,
  placeholder = 'Unit',
}: {
  name: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <>
      <SelectField value={value} onValueChange={(v) => onValueChange(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectField>
      <input type="hidden" name={name} value={value} />
    </>
  )
}
