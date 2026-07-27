'use client'

import { useActionState, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { updateRestaurantAction, type SettingsState } from '../actions'
import { useT } from '@/lib/i18n/client'
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
  const { dict } = useT()
  const [state, action, isPending] = useActionState<SettingsState, FormData>(
    updateRestaurantAction,
    null
  )
  // Controlled so the field doesn't warn when the page revalidates after save.
  const [nameValue, setNameValue] = useState(name)
  const [tz, setTz] = useState(timezone)
  const [listDay, setListDay] = useState<string>(listDefaultDay)
  const regionLabel = (r: string) =>
    (dict.timezones.groups as Record<string, string>)[r] ?? r

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.success && (
        <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
          {dict.common.saved}
        </div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="name">
        <FieldLabel>{dict.settings.restaurantName}</FieldLabel>
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
        <label className="text-sm font-medium text-foreground">{dict.settings.listDefaultLabel}</label>
        <SelectField name="listDefaultDay" value={listDay} onValueChange={(v) => { if (v) setListDay(v) }}>
          <SelectTrigger>
            <SelectValue>
              {() => (listDay === 'next_day' ? dict.settings.listDefaultNextDay : dict.settings.listDefaultToday)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{dict.settings.listDefaultToday}</SelectItem>
            <SelectItem value="next_day">{dict.settings.listDefaultNextDay}</SelectItem>
          </SelectContent>
        </SelectField>
        <input type="hidden" name="listDefaultDay" value={listDay} />
        <p className="text-xs text-muted-foreground">{dict.settings.listDefaultHelp}</p>
      </div>
      {/* Last: auto-detected at onboarding, so it's rarely touched — but it can't be
          dropped, since it decides which lists count as "today" on the dashboard. */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.settings.timezone}</label>
        <SelectField name="timezone" value={tz} onValueChange={(v) => { if (v) setTz(v) }}>
          <SelectTrigger>
            {/* Show the friendly label (not the raw IANA value with underscores). */}
            <SelectValue placeholder={dict.settings.selectTimezone}>
              {() => timezoneLabel(tz)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_GROUPS.map((group) => (
              <SelectGroup key={group.region}>
                <SelectGroupLabel>{regionLabel(group.region)}</SelectGroupLabel>
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
        <p className="text-xs text-muted-foreground">{dict.settings.timezoneHelp}</p>
      </div>
      <Button type="submit" className="min-h-[48px] text-base" disabled={isPending || !tz}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.settings.saveChanges}
      </Button>
    </form>
  )
}
