'use client'

import { useEffect, useActionState, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { completeOnboardingAction } from '@/app/(app)/onboarding/actions'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
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
import { useT } from '@/lib/i18n/client'

export function OnboardingForm() {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(completeOnboardingAction, null)
  const [timezone, setTimezone] = useState('')
  const regionLabel = (r: string) =>
    (dict.timezones.groups as Record<string, string>)[r] ?? r

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected) setTimezone(detected)
  }, [])

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="restaurantName">
        <FieldLabel>{dict.onboarding.restaurantName}</FieldLabel>
        <Input
          type="text"
          name="restaurantName"
          required
          placeholder={dict.onboarding.restaurantNamePlaceholder}
          autoComplete="organization"
          autoFocus
        />
        <FieldError />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.onboarding.timezone}</label>
        <SelectField
          name="timezone"
          value={timezone}
          onValueChange={(value) => { if (value) setTimezone(value) }}
        >
          <SelectTrigger>
            <SelectValue placeholder={dict.onboarding.selectTimezone}>
              {() => (timezone ? timezoneLabel(timezone) : dict.onboarding.selectTimezone)}
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
        {/* Hidden input ensures the value submits with the form even if SelectField doesn't */}
        <input type="hidden" name="timezone" value={timezone} />
      </div>
      <Button
        type="submit"
        className="w-full min-h-[52px] text-base"
        disabled={isPending || !timezone}
      >
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.onboarding.submit}
      </Button>
    </form>
  )
}
