import 'server-only'
import { getTranslations, keyOf, type TranslatableField } from './cache'
import type { PrepItem } from '@/lib/db/queries/prep-items'
import type {
  PrepListWithProgress,
  PrepListEntryWithMeta,
} from '@/lib/db/queries/prep-lists'
import type { Recipe } from '@/lib/db/queries/recipes'
import { getRestaurantUnitsForTranslation } from '@/lib/db/queries/restaurant-units'
import { UNIT_VALUES } from '@/lib/units'

// Display-augmented variants. The canonical fields are left untouched so edit
// forms keep editing the source text; the `*Display` fields hold the translation
// for the current viewer and are what read-only UI renders.
export type PrepItemDisplay = PrepItem & {
  nameDisplay: string
  descriptionDisplay: string | null
}
export type PrepListDisplay = PrepListWithProgress & { titleDisplay: string }
export type PrepListEntryDisplay = PrepListEntryWithMeta & {
  itemNameDisplay: string
  notesDisplay: string | null
  cookNoteDisplay: string | null
}

export async function translatePrepItems(
  items: PrepItem[],
  restaurantId: string,
  lang: 'en' | 'es'
): Promise<PrepItemDisplay[]> {
  const fields: TranslatableField[] = []
  for (const i of items) {
    fields.push({
      entityType: 'prep_item',
      entityId: i.id,
      field: 'name',
      sourceText: i.name,
      sourceLanguage: i.sourceLanguage,
    })
    if (i.description) {
      fields.push({
        entityType: 'prep_item',
        entityId: i.id,
        field: 'description',
        sourceText: i.description,
        sourceLanguage: i.sourceLanguage,
      })
    }
  }
  const t = await getTranslations(fields, restaurantId, lang)
  return items.map((i) => ({
    ...i,
    nameDisplay: t.get(keyOf('prep_item', i.id, 'name')) ?? i.name,
    descriptionDisplay: i.description
      ? (t.get(keyOf('prep_item', i.id, 'description')) ?? i.description)
      : i.description,
  }))
}

export async function translatePrepLists(
  lists: PrepListWithProgress[],
  restaurantId: string,
  lang: 'en' | 'es'
): Promise<PrepListDisplay[]> {
  const fields: TranslatableField[] = lists.map((l) => ({
    entityType: 'prep_list',
    entityId: l.id,
    field: 'title',
    sourceText: l.title,
    sourceLanguage: l.sourceLanguage,
  }))
  const t = await getTranslations(fields, restaurantId, lang)
  return lists.map((l) => ({
    ...l,
    titleDisplay: t.get(keyOf('prep_list', l.id, 'title')) ?? l.title,
  }))
}

// Single list title (the detail-page header), keyed like translatePrepLists so
// it shares the cache.
export async function translateListTitle(
  list: { id: string; title: string; sourceLanguage: 'en' | 'es' },
  restaurantId: string,
  lang: 'en' | 'es'
): Promise<string> {
  const t = await getTranslations(
    [
      {
        entityType: 'prep_list',
        entityId: list.id,
        field: 'title',
        sourceText: list.title,
        sourceLanguage: list.sourceLanguage,
      },
    ],
    restaurantId,
    lang
  )
  return t.get(keyOf('prep_list', list.id, 'title')) ?? list.title
}

export async function translatePrepListEntries(
  entries: PrepListEntryWithMeta[],
  restaurantId: string,
  lang: 'en' | 'es'
): Promise<PrepListEntryDisplay[]> {
  const fields: TranslatableField[] = []
  for (const e of entries) {
    // itemName shares the prep_item:name key with the items page (one cache).
    fields.push({
      entityType: 'prep_item',
      entityId: e.prepItemId,
      field: 'name',
      sourceText: e.itemName,
      sourceLanguage: e.itemSourceLanguage,
    })
    if (e.notes) {
      fields.push({
        entityType: 'prep_list_entry',
        entityId: e.id,
        field: 'notes',
        sourceText: e.notes,
        sourceLanguage: e.notesSourceLanguage,
      })
    }
    if (e.cookNote) {
      fields.push({
        entityType: 'prep_list_entry',
        entityId: e.id,
        field: 'cook_note',
        sourceText: e.cookNote,
        sourceLanguage: e.cookNoteSourceLanguage,
      })
    }
  }
  const t = await getTranslations(fields, restaurantId, lang)
  return entries.map((e) => ({
    ...e,
    itemNameDisplay: t.get(keyOf('prep_item', e.prepItemId, 'name')) ?? e.itemName,
    notesDisplay: e.notes
      ? (t.get(keyOf('prep_list_entry', e.id, 'notes')) ?? e.notes)
      : e.notes,
    cookNoteDisplay: e.cookNote
      ? (t.get(keyOf('prep_list_entry', e.id, 'cook_note')) ?? e.cookNote)
      : e.cookNote,
  }))
}

// Recipe with per-viewer translated ingredient names, ingredient units, and step
// text. Canonical `ingredients`/`instructions` are left intact so the editor keeps
// editing the source. `unitDisplay` is the translated unit label to show (built-in
// units are left raw for formatAmount to render; custom/free-text units are
// resolved here).
export type RecipeDisplay = Recipe & {
  ingredientsDisplay: { name: string; quantity: string; unit: string; unitDisplay: string }[]
  instructionsDisplay: { text: string }[]
}

const UNIT_SET = new Set<string>(UNIT_VALUES)

export async function translateRecipe(
  recipe: Recipe,
  restaurantId: string,
  lang: 'en' | 'es',
  customUnitLabels: Record<string, string>
): Promise<RecipeDisplay> {
  const fields: TranslatableField[] = []
  recipe.ingredients.forEach((ing, i) => {
    if (ing.name) {
      fields.push({
        entityType: 'recipe',
        entityId: recipe.id,
        field: `ingredient:${i}:name`,
        sourceText: ing.name,
        sourceLanguage: recipe.sourceLanguage,
      })
    }
    // Built-in units translate via the static units table (formatAmount); custom
    // units via the pre-built label map. Only free-text units (e.g. a pasted
    // "clove") that are neither go through the LLM cache.
    if (ing.unit && !UNIT_SET.has(ing.unit) && !(ing.unit in customUnitLabels)) {
      fields.push({
        entityType: 'recipe',
        entityId: recipe.id,
        field: `ingredient:${i}:unit`,
        sourceText: ing.unit,
        sourceLanguage: recipe.sourceLanguage,
      })
    }
  })
  recipe.instructions.forEach((step, i) => {
    if (step.text) {
      fields.push({
        entityType: 'recipe',
        entityId: recipe.id,
        field: `step:${i}:text`,
        sourceText: step.text,
        sourceLanguage: recipe.sourceLanguage,
      })
    }
  })

  const t = await getTranslations(fields, restaurantId, lang)

  const unitDisplayFor = (unit: string, i: number): string => {
    if (!unit || UNIT_SET.has(unit)) return unit // built-in: leave for formatAmount
    if (unit in customUnitLabels) return customUnitLabels[unit]
    return t.get(keyOf('recipe', recipe.id, `ingredient:${i}:unit`)) ?? unit
  }

  return {
    ...recipe,
    ingredientsDisplay: recipe.ingredients.map((ing, i) => ({
      name: ing.name
        ? (t.get(keyOf('recipe', recipe.id, `ingredient:${i}:name`)) ?? ing.name)
        : ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      unitDisplay: unitDisplayFor(ing.unit, i),
    })),
    instructionsDisplay: recipe.instructions.map((step, i) => ({
      text: step.text
        ? (t.get(keyOf('recipe', recipe.id, `step:${i}:text`)) ?? step.text)
        : (step.text ?? ''),
    })),
  }
}

// Map of custom-unit label → translated label, for display. Built-in units are
// NOT here (they translate via the static map in lib/units.ts). Same-language
// units map to themselves.
export async function getCustomUnitLabelMap(
  restaurantId: string,
  lang: 'en' | 'es'
): Promise<Record<string, string>> {
  const units = await getRestaurantUnitsForTranslation(restaurantId)
  if (units.length === 0) return {}
  const t = await getTranslations(
    units.map((u) => ({
      entityType: 'restaurant_unit',
      entityId: u.id,
      field: 'label',
      sourceText: u.label,
      sourceLanguage: u.sourceLanguage,
    })),
    restaurantId,
    lang
  )
  const map: Record<string, string> = {}
  for (const u of units) {
    map[u.label] = t.get(keyOf('restaurant_unit', u.id, 'label')) ?? u.label
  }
  return map
}
