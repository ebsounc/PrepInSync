// Units of measure for prep items and list entries. Stored as canonical English
// strings (e.g. 'qt', 'each') on prep_items.default_unit / par_unit and
// prep_list_entries.unit.
// Values stay English; Phase 3 translates the labels for display. Restaurants can
// also add their own units (restaurant_units table) — those are arbitrary strings
// validated at write time, not part of this built-in set.
export const UNIT_VALUES = [
  'lb',
  'kg',
  'oz',
  'g',
  'qt',
  'L',
  'gal',
  'pint',
  'case',
  'tray',
  'container',
  'bag',
  'bunch',
  'each',
] as const

export type Unit = (typeof UNIT_VALUES)[number]

// label = singular form; labelPlural = shown when quantity != 1. Abbreviations
// (kg, oz, g, L, qt, gal) don't pluralize; word-like units do (lb→lbs, case→cases).
export const UNITS: { value: Unit; label: string; labelPlural: string }[] = [
  { value: 'lb', label: 'lb', labelPlural: 'lbs' },
  { value: 'kg', label: 'kg', labelPlural: 'kg' },
  { value: 'oz', label: 'oz', labelPlural: 'oz' },
  { value: 'g', label: 'g', labelPlural: 'g' },
  { value: 'qt', label: 'qt', labelPlural: 'qt' },
  { value: 'L', label: 'L', labelPlural: 'L' },
  { value: 'gal', label: 'gal', labelPlural: 'gal' },
  { value: 'pint', label: 'pint', labelPlural: 'pints' },
  { value: 'case', label: 'case', labelPlural: 'cases' },
  { value: 'tray', label: 'tray', labelPlural: 'trays' },
  { value: 'container', label: 'container', labelPlural: 'containers' },
  { value: 'bag', label: 'bag', labelPlural: 'bags' },
  { value: 'bunch', label: 'bunch', labelPlural: 'bunches' },
  { value: 'each', label: 'each', labelPlural: 'each' },
]

const UNIT_BY_VALUE = new Map(UNITS.map((u) => [u.value, u]))

// numeric columns come back as strings (e.g. "1.50"); trim trailing zeros for display.
export function formatQuantity(q: string | null): string {
  if (q == null) return ''
  const n = Number(q)
  return Number.isFinite(n) ? String(n) : q
}

// Renders a unit pluralized to match the quantity. Built-in units use their
// labelPlural; custom (restaurant) units are shown verbatim (we don't know their
// plural form). Quantity of exactly 1 (or unparseable) uses the singular.
export function formatUnit(unit: string, quantity: string | number | null): string {
  const builtin = UNIT_BY_VALUE.get(unit as Unit)
  if (!builtin) return unit
  const n = typeof quantity === 'number' ? quantity : Number(quantity)
  return Number.isFinite(n) && n !== 1 ? builtin.labelPlural : builtin.label
}

// Convenience: "2 lbs", "1 case", "3 trays". Empty quantity falls back to the unit.
export function formatAmount(quantity: string | null, unit: string | null): string {
  if (!unit) return formatQuantity(quantity)
  const q = formatQuantity(quantity)
  return q ? `${q} ${formatUnit(unit, quantity)}` : formatUnit(unit, quantity)
}
