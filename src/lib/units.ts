// Units of measure for prep items and list entries. Stored as canonical English
// strings (e.g. 'qt', 'each') on prep_items.par_unit and prep_list_entries.unit.
// Values stay English; Phase 3 translates the labels for display.
export const UNIT_VALUES = [
  'lb',
  'kg',
  'oz',
  'g',
  'qt',
  'L',
  'gal',
  'case',
  'each',
] as const

export type Unit = (typeof UNIT_VALUES)[number]

export const UNITS: { value: Unit; label: string }[] = UNIT_VALUES.map((v) => ({
  value: v,
  label: v,
}))

// numeric columns come back as strings (e.g. "1.50"); trim trailing zeros for display.
export function formatQuantity(q: string | null): string {
  if (q == null) return ''
  const n = Number(q)
  return Number.isFinite(n) ? String(n) : q
}
