// Human-friendly formatting for dates and greetings.
// NOTE: this module must stay free of any runtime dictionary import — it's pulled
// into a client component (edit-list-form). `Lang` is a type-only import (erased),
// and the greeting returns a KEY the caller looks up in its own dict, so neither
// dictionary is ever bundled here.
import type { Lang } from '@/lib/i18n'

const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-ES' }

// Formats a stored calendar date ('YYYY-MM-DD') as "Thursday, June 4" (en) or
// "jueves, 4 de junio" (es). Parsed as UTC so the displayed day never shifts with
// the server/runtime timezone.
export function formatListDate(date: string, lang: Lang = 'en'): string {
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

// Returns the time-of-day greeting KEY for the current hour in the given timezone.
// The caller resolves it against its dictionary (dict.greeting[key]) — keeps this
// module dictionary-free.
export function greetingKey(timeZone: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone }).format(
      new Date()
    )
  )
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
