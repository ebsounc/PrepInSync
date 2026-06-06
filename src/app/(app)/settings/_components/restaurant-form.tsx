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
import { TIMEZONE_GROUPS, timezoneLabel } from '@/lib/auth/timezones'

export function RestaurantForm({
  name,
  timezone,
  listDefaultDay,
}: {
  name: string
  timezone: string
  listDefaultDay: 'today' | 'next_day'
}) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(
    updateRestaurantAction,
    null
  )
  // Controlled so the field doesn't warn when the page revalidates after save.
  const [nameValue, setNameValue] = useState(name)
  const [tz, setTz] = useState(timezone)
  const [listDay, setListDay] = useState<string>(listDefaultDay)

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
            {/* Show the friendly label (not the raw IANA value with underscores). */}
            <SelectValue placeholder="Select your timezone">
              {() => timezoneLabel(tz)}
            </SelectValue>
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">We usually build lists for</label>
        <SelectField name="listDefaultDay" value={listDay} onValueChange={(v) => { if (v) setListDay(v) }}>
          <SelectTrigger>
            <SelectValue placeholder="Choose">
              {() => (listDay === 'next_day' ? 'The next day' : 'Today')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="next_day">The next day</SelectItem>
          </SelectContent>
        </SelectField>
        <input type="hidden" name="listDefaultDay" value={listDay} />
        <p className="text-xs text-muted-foreground">
          Sets the default date and title when you create a new prep list.
        </p>
      </div>
      <Button type="submit" className="min-h-[48px] text-base" disabled={isPending || !tz}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save changes'}
      </Button>
    </form>
  )
}
