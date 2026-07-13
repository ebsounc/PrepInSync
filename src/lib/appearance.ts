// Shared appearance constants + validation. Imported by the settings form (client),
// the settings server action (server), and the root layout (server) — so it stays
// framework-neutral: no 'server-only', and `document` is only touched inside a
// function that client code calls, never at module load.

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

// The CSS custom properties an accent overrides. Reused by the form's live preview,
// the no-flash script, and the server-side inline style in the root layout.
export const ACCENT_VARS = ['--primary', '--ring', '--sidebar-primary'] as const

// Preset accents. `value: null` = the baked-in green default (clears any override).
export const ACCENTS: { key: string; value: string | null; swatch: string }[] = [
  { key: 'green', value: null, swatch: 'oklch(0.58 0.15 152)' },
  { key: 'teal', value: 'oklch(0.62 0.11 190)', swatch: 'oklch(0.62 0.11 190)' },
  { key: 'sky', value: 'oklch(0.62 0.13 230)', swatch: 'oklch(0.62 0.13 230)' },
  { key: 'blue', value: 'oklch(0.55 0.19 255)', swatch: 'oklch(0.55 0.19 255)' },
  { key: 'indigo', value: 'oklch(0.5 0.21 272)', swatch: 'oklch(0.5 0.21 272)' },
  { key: 'violet', value: 'oklch(0.56 0.22 300)', swatch: 'oklch(0.56 0.22 300)' },
  { key: 'rose', value: 'oklch(0.6 0.2 12)', swatch: 'oklch(0.6 0.2 12)' },
  { key: 'amber', value: 'oklch(0.72 0.16 70)', swatch: 'oklch(0.72 0.16 70)' },
]

// The fixed set of valid preset oklch strings (the green default is `null`, excluded).
const ACCENT_VALUES = new Set(
  ACCENTS.map((a) => a.value).filter((v): v is string => v !== null)
)

// Hex from <input type="color"> is always 6-digit (#rrggbb).
const HEX_RE = /^#[0-9a-f]{6}$/i

// Validates an accent before it is stored OR inlined into a `style` attribute.
// null/'' = the default (no override) and is valid. Otherwise the value must be a
// known preset oklch OR a hex color — nothing else. This is the CSS-injection guard:
// the accent is rendered server-side into a `style`, and the cookie is user-editable,
// so both the write path and the layout re-check with this before trusting a value.
export function isValidAccent(value: string | null | undefined): boolean {
  if (value == null || value === '') return true
  return ACCENT_VALUES.has(value) || HEX_RE.test(value)
}

// Applies (or clears) an accent on the document root — client-only live preview.
export function applyAccent(value: string | null) {
  const root = document.documentElement
  for (const prop of ACCENT_VARS) {
    if (value) root.style.setProperty(prop, value)
    else root.style.removeProperty(prop)
  }
}
