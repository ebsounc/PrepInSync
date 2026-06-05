'use client'

import { useActionState, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { updateRestaurantAction, type SettingsState } from '../actions'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
} from '@/components/ui/select'
import { TIMEZONE_GROUPS } from '@/lib/auth/timezones'

export function RestaurantForm({ name, timezone }: { name: string; timezone: string }) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(
    updateRestaurantAction,
    null
  )
  // Controlled so the field doesn't warn when the page revalidates after save.
  const [nameValue, setNameValue] = useState(name)
  const [tz, setTz] = useState(timezone)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.success && (
        <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">Saved.</div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="name">
        <FieldLabel>Restaurant name</FieldLabel>
        <Input
          type="text"
          name="name"
          required
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          spellCheck
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Timezone</label>
        <SelectField name="timezone" value={tz} onValueChange={(v) => { if (v) setTz(v) }}>
          <SelectTrigger>
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_GROUPS.map((group) => (
              <SelectGroup key={group.region}>
                <SelectGroupLabel>{group.region}</SelectGroupLabel>
                {group.zones.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </SelectField>
        <input type="hidden" name="timezone" value={tz} />
      </div>
      <Button type="submit" className="min-h-[48px] text-base" disabled={isPending || !tz}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save changes'}
      </Button>
    </form>
  )
}
