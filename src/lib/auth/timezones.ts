export type TimezoneOption = { value: string; label: string }
export type TimezoneGroup = { region: string; zones: TimezoneOption[] }

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    region: 'Americas',
    zones: [
      { value: 'America/New_York', label: 'Eastern Time — New York, Miami' },
      { value: 'America/Chicago', label: 'Central Time — Chicago, Houston' },
      { value: 'America/Denver', label: 'Mountain Time — Denver, Phoenix area' },
      { value: 'America/Phoenix', label: 'Arizona Time (no DST) — Phoenix' },
      { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles, Seattle' },
      { value: 'America/Anchorage', label: 'Alaska Time — Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time — Honolulu' },
      { value: 'America/Toronto', label: 'Eastern Time — Toronto' },
      { value: 'America/Vancouver', label: 'Pacific Time — Vancouver' },
      { value: 'America/Winnipeg', label: 'Central Time — Winnipeg' },
      { value: 'America/Halifax', label: 'Atlantic Time — Halifax' },
      { value: 'America/St_Johns', label: 'Newfoundland Time — St. Johns' },
      { value: 'America/Mexico_City', label: 'Central Time — Mexico City' },
      { value: 'America/Monterrey', label: 'Central Time — Monterrey' },
      { value: 'America/Tijuana', label: 'Pacific Time — Tijuana' },
      { value: 'America/Bogota', label: 'Colombia Time — Bogotá' },
      { value: 'America/Lima', label: 'Peru Time — Lima' },
      { value: 'America/Santiago', label: 'Chile Time — Santiago' },
      { value: 'America/Sao_Paulo', label: 'Brasilia Time — São Paulo' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time — Buenos Aires' },
      { value: 'America/Caracas', label: 'Venezuela Time — Caracas' },
      { value: 'America/Puerto_Rico', label: 'Atlantic Time — Puerto Rico' },
    ],
  },
  {
    region: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'GMT/BST — London' },
      { value: 'Europe/Dublin', label: 'GMT/IST — Dublin' },
      { value: 'Europe/Lisbon', label: 'WET/WEST — Lisbon' },
      { value: 'Europe/Paris', label: 'CET/CEST — Paris, Lyon' },
      { value: 'Europe/Berlin', label: 'CET/CEST — Berlin, Frankfurt' },
      { value: 'Europe/Amsterdam', label: 'CET/CEST — Amsterdam' },
      { value: 'Europe/Brussels', label: 'CET/CEST — Brussels' },
      { value: 'Europe/Zurich', label: 'CET/CEST — Zurich' },
      { value: 'Europe/Madrid', label: 'CET/CEST — Madrid, Barcelona' },
      { value: 'Europe/Rome', label: 'CET/CEST — Rome, Milan' },
      { value: 'Europe/Warsaw', label: 'CET/CEST — Warsaw' },
      { value: 'Europe/Stockholm', label: 'CET/CEST — Stockholm' },
      { value: 'Europe/Oslo', label: 'CET/CEST — Oslo' },
      { value: 'Europe/Copenhagen', label: 'CET/CEST — Copenhagen' },
      { value: 'Europe/Helsinki', label: 'EET/EEST — Helsinki' },
      { value: 'Europe/Athens', label: 'EET/EEST — Athens' },
      { value: 'Europe/Bucharest', label: 'EET/EEST — Bucharest' },
      { value: 'Europe/Kiev', label: 'EET/EEST — Kyiv' },
      { value: 'Europe/Moscow', label: 'MSK — Moscow' },
      { value: 'Europe/Istanbul', label: 'TRT — Istanbul' },
    ],
  },
  {
    region: 'Middle East & Africa',
    zones: [
      { value: 'Asia/Jerusalem', label: 'IST/IDT — Jerusalem, Tel Aviv' },
      { value: 'Asia/Dubai', label: 'GST — Dubai, Abu Dhabi' },
      { value: 'Asia/Riyadh', label: 'AST — Riyadh' },
      { value: 'Africa/Cairo', label: 'EET — Cairo' },
      { value: 'Africa/Nairobi', label: 'EAT — Nairobi' },
      { value: 'Africa/Johannesburg', label: 'SAST — Johannesburg' },
      { value: 'Africa/Lagos', label: 'WAT — Lagos' },
      { value: 'Africa/Casablanca', label: 'WET — Casablanca' },
    ],
  },
  {
    region: 'Asia & Pacific',
    zones: [
      { value: 'Asia/Karachi', label: 'PKT — Karachi' },
      { value: 'Asia/Kolkata', label: 'IST — Mumbai, Delhi, Kolkata' },
      { value: 'Asia/Dhaka', label: 'BST — Dhaka' },
      { value: 'Asia/Bangkok', label: 'ICT — Bangkok, Jakarta' },
      { value: 'Asia/Singapore', label: 'SGT — Singapore, Kuala Lumpur' },
      { value: 'Asia/Shanghai', label: 'CST — Beijing, Shanghai' },
      { value: 'Asia/Hong_Kong', label: 'HKT — Hong Kong' },
      { value: 'Asia/Taipei', label: 'CST — Taipei' },
      { value: 'Asia/Tokyo', label: 'JST — Tokyo, Osaka' },
      { value: 'Asia/Seoul', label: 'KST — Seoul' },
      { value: 'Australia/Perth', label: 'AWST — Perth' },
      { value: 'Australia/Darwin', label: 'ACST — Darwin' },
      { value: 'Australia/Brisbane', label: 'AEST — Brisbane' },
      { value: 'Australia/Sydney', label: 'AEST/AEDT — Sydney, Melbourne' },
      { value: 'Australia/Adelaide', label: 'ACST/ACDT — Adelaide' },
      { value: 'Pacific/Auckland', label: 'NZST/NZDT — Auckland' },
      { value: 'Pacific/Fiji', label: 'FJT — Fiji' },
      { value: 'Pacific/Guam', label: 'ChST — Guam' },
    ],
  },
]

export const ALL_TIMEZONES: string[] = TIMEZONE_GROUPS.flatMap((g) =>
  g.zones.map((z) => z.value)
)

const TIMEZONE_LABELS = new Map(
  TIMEZONE_GROUPS.flatMap((g) => g.zones.map((z) => [z.value, z.label] as const))
)

// Friendly label for a timezone value (e.g. "Eastern Time — New York"); falls back to
// the IANA name with underscores swapped for spaces so the trigger never shows "New_York".
export function timezoneLabel(value: string): string {
  return TIMEZONE_LABELS.get(value) ?? value.replace(/_/g, ' ')
}
