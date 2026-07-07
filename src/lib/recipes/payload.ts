import { z } from 'zod'
import { resolveKey, type Dict } from '@/lib/i18n'
import type { RecipeIngredient, RecipeStep } from '@/lib/db/queries/recipes'

// Recipe units are FREE TEXT — deliberately NOT run through isValidUnit (a pasted or
// scanned recipe uses "cup"/"tbsp"/"clove" that aren't built-ins or custom units).
const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'errors.recipes.ingredientNameRequired').max(200),
  quantity: z.string().trim().max(20).default(''),
  unit: z.string().trim().max(40).default(''),
})
const stepSchema = z.object({
  text: z.string().trim().min(1, 'errors.recipes.stepTextRequired').max(2000),
})
// Cap array length so a crafted payload can't write an unbounded JSONB blob or fan
// out into a huge translation batch. Well above any real recipe.
const recipeSchema = z.object({
  ingredients: z.array(ingredientSchema).min(1, 'errors.recipes.ingredientsRequired').max(100),
  instructions: z.array(stepSchema).min(1, 'errors.recipes.stepsRequired').max(100),
})

export type ParsedRecipePayload = { ingredients: RecipeIngredient[]; instructions: RecipeStep[] }

// Parses a recipe JSON string (the client's serialized ingredient/step state) into a
// validated payload or an i18n error message. Shared by the recipe page's save and the
// inline "add recipe while creating an item" flow.
export function parseRecipeJson(
  json: string,
  dict: Dict
): ParsedRecipePayload | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { error: dict.errors.recipes.invalidRecipe }
  }
  const parsed = recipeSchema.safeParse(raw)
  if (!parsed.success) return { error: resolveKey(dict, parsed.error.issues[0].message) }
  return { ingredients: parsed.data.ingredients, instructions: parsed.data.instructions }
}

// True when a serialized recipe payload actually has content (≥1 ingredient or step).
// An empty recipe section (opened but left blank) is skipped, not treated as an error.
export function recipeJsonHasContent(json: string): boolean {
  try {
    const raw = JSON.parse(json) as { ingredients?: unknown[]; instructions?: unknown[] }
    return (raw.ingredients?.length ?? 0) > 0 || (raw.instructions?.length ?? 0) > 0
  } catch {
    return false
  }
}
