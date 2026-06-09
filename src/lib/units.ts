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
// labelEs / labelPluralEs are the static Spanish forms (from the kitchen glossary
// in docs/translation-validation.md §2). Built-in units are translated from this
// table — they never go through the LLM. Metric abbreviations (kg, g, L) are the
// same in both languages.
export const UNITS: {
  value: Unit
  label: string
  labelPlural: string
  labelEs: string
  labelPluralEs: string
}[] = [
  { value: 'lb', label: 'lb', labelPlural: 'lbs', labelEs: 'libra', labelPluralEs: 'libras' },
  { value: 'kg', label: 'kg', labelPlural: 'kg', labelEs: 'kg', labelPluralEs: 'kg' },
  { value: 'oz', label: 'oz', labelPlural: 'oz', labelEs: 'onza', labelPluralEs: 'onzas' },
  { value: 'g', label: 'g', labelPlural: 'g', labelEs: 'g', labelPluralEs: 'g' },
  { value: 'qt', label: 'qt', labelPlural: 'qt', labelEs: 'cuarto', labelPluralEs: 'cuartos' },
  { value: 'L', label: 'L', labelPlural: 'L', labelEs: 'L', labelPluralEs: 'L' },
  { value: 'gal', label: 'gal', labelPlural: 'gal', labelEs: 'galón', labelPluralEs: 'galones' },
  { value: 'pint', label: 'pint', labelPlural: 'pints', labelEs: 'pinta', labelPluralEs: 'pintas' },
  { value: 'case', label: 'case', labelPlural: 'cases', labelEs: 'caja', labelPluralEs: 'cajas' },
  { value: 'tray', label: 'tray', labelPlural: 'trays', labelEs: 'bandeja', labelPluralEs: 'bandejas' },
  { value: 'container', label: 'container', labelPlural: 'containers', labelEs: 'recipiente', labelPluralEs: 'recipientes' },
  { value: 'bag', label: 'bag', labelPlural: 'bags', labelEs: 'bolsa', labelPluralEs: 'bolsas' },
  { value: 'bunch', label: 'bunch', labelPlural: 'bunches', labelEs: 'manojo', labelPluralEs: 'manojos' },
  { value: 'each', label: 'each', labelPlural: 'each', labelEs: 'c/u', labelPluralEs: 'c/u' },
]

const UNIT_BY_VALUE = new Map(UNITS.map((u) => [u.value, u]))

// numeric columns come back as strings (e.g. "1.50"); trim trailing zeros for display.
export function formatQuantity(q: string | null): string {
  if (q == null) return ''
  const n = Number(q)
  return Number.isFinite(n) ? String(n) : q
}

// Renders a unit pluralized to match the quantity, in the given language
// (default 'en'). Built-in units use their (Spanish) label/plural from the table;
// custom (restaurant) units are shown verbatim — callers pass an already-translated
// label for those. Quantity of exactly 1 (or unparseable) uses the singular.
export function formatUnit(
  unit: string,
  quantity: string | number | null,
  lang: 'en' | 'es' = 'en'
): string {
  const builtin = UNIT_BY_VALUE.get(unit as Unit)
  if (!builtin) return unit
  const n = typeof quantity === 'number' ? quantity : Number(quantity)
  const plural = Number.isFinite(n) && n !== 1
  if (lang === 'es') return plural ? builtin.labelPluralEs : builtin.labelEs
  return plural ? builtin.labelPlural : builtin.label
}

// Convenience: "2 lbs" / "2 libras". Empty quantity falls back to the unit.
export function formatAmount(
  quantity: string | null,
  unit: string | null,
  lang: 'en' | 'es' = 'en'
): string {
  if (!unit) return formatQuantity(quantity)
  const q = formatQuantity(quantity)
  return q ? `${q} ${formatUnit(unit, quantity, lang)}` : formatUnit(unit, quantity, lang)
}
