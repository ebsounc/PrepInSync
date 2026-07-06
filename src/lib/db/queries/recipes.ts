import 'server-only'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db, recipes } from '@/lib/db'

export type Recipe = typeof recipes.$inferSelect
export type RecipeIngredient = { name: string; quantity: string; unit: string }
export type RecipeStep = { text?: string; imageUrl?: string }

// A recipe is one-per-item by convention (enforced in the create action via
// hasRecipe, not a DB unique index — see docs/database.md). Reads take the oldest
// row so a stray duplicate never flips which recipe shows.
export async function getRecipeByItemId(
  prepItemId: string,
  restaurantId: string
): Promise<Recipe | null> {
  const rows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.prepItemId, prepItemId), eq(recipes.restaurantId, restaurantId)))
    .orderBy(asc(recipes.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export async function hasRecipe(prepItemId: string, restaurantId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(recipes)
    .where(and(eq(recipes.prepItemId, prepItemId), eq(recipes.restaurantId, restaurantId)))
  return (row?.n ?? 0) > 0
}

// Which of the given item ids have a recipe — one query for list/badge rendering
// so pages don't fan out an existence check per item.
export async function getRecipeItemIds(
  restaurantId: string,
  itemIds: string[]
): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set()
  const rows = await db
    .select({ prepItemId: recipes.prepItemId })
    .from(recipes)
    .where(and(eq(recipes.restaurantId, restaurantId), inArray(recipes.prepItemId, itemIds)))
  return new Set(rows.map((r) => r.prepItemId))
}

export async function createRecipe(data: {
  prepItemId: string
  restaurantId: string
  ingredients: RecipeIngredient[]
  instructions: RecipeStep[]
  sourceLanguage: 'en' | 'es'
  createdBy: string
}): Promise<Recipe> {
  const [row] = await db
    .insert(recipes)
    .values({
      prepItemId: data.prepItemId,
      restaurantId: data.restaurantId,
      ingredients: data.ingredients,
      instructions: data.instructions,
      // The language the recipe was authored in — drives translation direction.
      sourceLanguage: data.sourceLanguage,
      createdBy: data.createdBy,
    })
    .returning()
  return row
}

// restaurantId scopes the update so one restaurant can never touch another's recipe.
// sourceLanguage is re-stamped to the editor's language — the text is theirs now.
export async function updateRecipe(
  id: string,
  restaurantId: string,
  data: {
    ingredients: RecipeIngredient[]
    instructions: RecipeStep[]
    sourceLanguage: 'en' | 'es'
  }
) {
  await db
    .update(recipes)
    .set({
      ingredients: data.ingredients,
      instructions: data.instructions,
      sourceLanguage: data.sourceLanguage,
      updatedAt: new Date(),
    })
    .where(and(eq(recipes.id, id), eq(recipes.restaurantId, restaurantId)))
}

export async function deleteRecipe(id: string, restaurantId: string) {
  await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.restaurantId, restaurantId)))
}
