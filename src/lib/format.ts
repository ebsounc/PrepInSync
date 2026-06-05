// Human-friendly formatting for dates and greetings.

// Formats a stored calendar date ('YYYY-MM-DD') as "Thursday, June 4". Parsed as
// UTC so the displayed day never shifts with the server/runtime timezone.
export function formatListDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

// Time-of-day greeting based on the current hour in the given timezone.
export function getGreeting(timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone,
    }).format(new Date())
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
