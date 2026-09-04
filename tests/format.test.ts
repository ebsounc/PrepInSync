import { describe, it, expect, afterEach, vi } from 'vitest'
import { formatListDate, greetingKey } from '@/lib/format'

describe('formatListDate', () => {
  it('formats a stored calendar date in English', () => {
    expect(formatListDate('2026-06-04')).toBe('Thursday, June 4')
    expect(formatListDate('2026-06-04', 'en')).toBe('Thursday, June 4')
  })

  it('formats in Spanish', () => {
    const out = formatListDate('2026-06-04', 'es')
    expect(out).toContain('jueves')
    expect(out).toContain('junio')
    expect(out).toContain('4')
  })

  // The guarantee in the source comment: the date is parsed as UTC and formatted with
  // timeZone: 'UTC', so the rendered day never shifts with the host's timezone. These
  // month/year boundaries are where that breaks first.
  //
  // CI runs the suite under two deliberately awkward zones, because they catch
  // different regressions and neither catches both:
  //   - Pacific/Niue (UTC-11) catches a dropped `timeZone: 'UTC'` on the formatter.
  //   - Pacific/Kiritimati (UTC+14) catches a parse that loses its 'Z' and is read
  //     as local time instead.
  // (TZ is ignored on Windows, so these only bite on the Linux runner.)
  it('never shifts the day at a month or year boundary', () => {
    expect(formatListDate('2026-01-01')).toBe('Thursday, January 1')
    expect(formatListDate('2026-12-31')).toBe('Thursday, December 31')
    expect(formatListDate('2026-03-01')).toBe('Sunday, March 1')
    expect(formatListDate('2026-02-28')).toBe('Saturday, February 28')
  })

  it('renders a leap day', () => {
    expect(formatListDate('2028-02-29')).toBe('Tuesday, February 29')
  })

  it('returns the raw input when it is not a parseable date', () => {
    expect(formatListDate('not-a-date')).toBe('not-a-date')
    expect(formatListDate('')).toBe('')
  })
})

describe('greetingKey', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (iso: string) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(iso))
  }

  it('returns morning from midnight until 11:59', () => {
    at('2026-06-04T00:00:00Z')
    expect(greetingKey('UTC')).toBe('morning')
    at('2026-06-04T11:59:59Z')
    expect(greetingKey('UTC')).toBe('morning')
  })

  it('flips to afternoon at 12:00', () => {
    at('2026-06-04T12:00:00Z')
    expect(greetingKey('UTC')).toBe('afternoon')
    at('2026-06-04T16:59:59Z')
    expect(greetingKey('UTC')).toBe('afternoon')
  })

  it('flips to evening at 17:00 and stays there until midnight', () => {
    at('2026-06-04T17:00:00Z')
    expect(greetingKey('UTC')).toBe('evening')
    at('2026-06-04T23:59:59Z')
    expect(greetingKey('UTC')).toBe('evening')
  })

  it('uses the restaurant timezone rather than the server clock', () => {
    // 02:00 UTC is still the previous evening in Los Angeles. A kitchen closing up
    // should read "Good evening", not "Good morning".
    at('2026-06-04T02:00:00Z')
    expect(greetingKey('UTC')).toBe('morning')
    expect(greetingKey('America/Los_Angeles')).toBe('evening')
  })

  it('handles a timezone with a half-hour offset', () => {
    // 06:45 UTC is 12:15 in Kolkata (UTC+5:30) -- just past the afternoon boundary.
    at('2026-06-04T06:45:00Z')
    expect(greetingKey('Asia/Kolkata')).toBe('afternoon')
    at('2026-06-04T06:15:00Z')
    expect(greetingKey('Asia/Kolkata')).toBe('morning')
  })
})
