import { describe, it, expect } from 'vitest'
import { getDictionary } from '@/lib/i18n'
import { parseRecipeJson, recipeJsonHasContent } from '@/lib/recipes/payload'

const dict = getDictionary('en')

const valid = {
  ingredients: [{ name: 'Yellow onion', quantity: '2', unit: 'lb' }],
  instructions: [{ text: 'Dice fine, 1/4 inch' }],
}
const json = (value: unknown) => JSON.stringify(value)

const isError = (r: ReturnType<typeof parseRecipeJson>): r is { error: string } => 'error' in r

describe('parseRecipeJson', () => {
  it('parses a well-formed payload', () => {
    const result = parseRecipeJson(json(valid), dict)
    expect(isError(result)).toBe(false)
    if (isError(result)) return
    expect(result.ingredients).toEqual([{ name: 'Yellow onion', quantity: '2', unit: 'lb' }])
    expect(result.instructions).toEqual([{ text: 'Dice fine, 1/4 inch' }])
  })

  it('rejects malformed JSON with the invalid-recipe message', () => {
    expect(parseRecipeJson('{not json', dict)).toEqual({
      error: dict.errors.recipes.invalidRecipe,
    })
    expect(parseRecipeJson('', dict)).toEqual({ error: dict.errors.recipes.invalidRecipe })
  })

  it('resolves the Zod key into real dictionary text, not the raw key', () => {
    // Zod messages carry a dotted dictionary key; if resolveKey ever stopped being
    // applied, the cook would see "errors.recipes.ingredientsRequired" on screen.
    const result = parseRecipeJson(json({ ...valid, ingredients: [] }), dict)
    expect(result).toEqual({ error: dict.errors.recipes.ingredientsRequired })
    expect(isError(result) && result.error).not.toContain('errors.recipes')
  })

  it('requires at least one step', () => {
    expect(parseRecipeJson(json({ ...valid, instructions: [] }), dict)).toEqual({
      error: dict.errors.recipes.stepsRequired,
    })
  })

  it('requires every ingredient to have a name', () => {
    const result = parseRecipeJson(
      json({ ...valid, ingredients: [{ name: '   ', quantity: '', unit: '' }] }),
      dict
    )
    expect(result).toEqual({ error: dict.errors.recipes.ingredientNameRequired })
  })

  it('requires every step to have text', () => {
    const result = parseRecipeJson(json({ ...valid, instructions: [{ text: '  ' }] }), dict)
    expect(result).toEqual({ error: dict.errors.recipes.stepTextRequired })
  })

  it('defaults an omitted quantity and unit to empty strings', () => {
    // "salt to taste" -- an ingredient with no amount is legitimate.
    const result = parseRecipeJson(json({ ...valid, ingredients: [{ name: 'Salt' }] }), dict)
    expect(isError(result)).toBe(false)
    if (isError(result)) return
    expect(result.ingredients[0]).toEqual({ name: 'Salt', quantity: '', unit: '' })
  })

  it('trims surrounding whitespace', () => {
    const result = parseRecipeJson(
      json({
        ingredients: [{ name: '  Yellow onion  ', quantity: ' 2 ', unit: ' lb ' }],
        instructions: [{ text: '  Dice fine  ' }],
      }),
      dict
    )
    expect(isError(result)).toBe(false)
    if (isError(result)) return
    expect(result.ingredients[0]).toEqual({ name: 'Yellow onion', quantity: '2', unit: 'lb' })
    expect(result.instructions[0].text).toBe('Dice fine')
  })

  it('keeps free-text recipe units rather than validating them against the unit list', () => {
    // Pasted recipes say "clove" and "tbsp"; those are intentionally not checked
    // against the built-in/custom unit allow-list.
    const result = parseRecipeJson(
      json({
        ingredients: [{ name: 'Garlic', quantity: '3', unit: 'clove' }],
        instructions: [{ text: 'Mince' }],
      }),
      dict
    )
    expect(isError(result)).toBe(false)
    if (isError(result)) return
    expect(result.ingredients[0].unit).toBe('clove')
  })

  it('caps the arrays so a crafted payload cannot write an unbounded JSONB blob', () => {
    const tooMany = {
      ingredients: Array.from({ length: 101 }, (_, i) => ({
        name: `i${i}`,
        quantity: '',
        unit: '',
      })),
      instructions: valid.instructions,
    }
    expect(isError(parseRecipeJson(json(tooMany), dict))).toBe(true)

    const tooManySteps = {
      ingredients: valid.ingredients,
      instructions: Array.from({ length: 101 }, (_, i) => ({ text: `s${i}` })),
    }
    expect(isError(parseRecipeJson(json(tooManySteps), dict))).toBe(true)
  })

  it('accepts exactly 100 of each (the boundary is inclusive)', () => {
    const atCap = {
      ingredients: Array.from({ length: 100 }, (_, i) => ({
        name: `i${i}`,
        quantity: '',
        unit: '',
      })),
      instructions: Array.from({ length: 100 }, (_, i) => ({ text: `s${i}` })),
    }
    expect(isError(parseRecipeJson(json(atCap), dict))).toBe(false)
  })

  it('caps individual field lengths', () => {
    const longName = {
      ingredients: [{ name: 'x'.repeat(201), quantity: '', unit: '' }],
      instructions: valid.instructions,
    }
    expect(isError(parseRecipeJson(json(longName), dict))).toBe(true)

    const longStep = {
      ingredients: valid.ingredients,
      instructions: [{ text: 'x'.repeat(2001) }],
    }
    expect(isError(parseRecipeJson(json(longStep), dict))).toBe(true)
  })

  it('returns an error rather than throwing on structurally wrong input', () => {
    // These come from non-UI callers only; the message may be Zod's own rather than a
    // dictionary string, but it must never crash the action.
    for (const bad of ['null', '[]', '"a string"', '42', '{}']) {
      expect(isError(parseRecipeJson(bad, dict)), `${bad} should error`).toBe(true)
    }
  })
})

describe('recipeJsonHasContent', () => {
  it('is true when there is at least one ingredient or step', () => {
    expect(recipeJsonHasContent(json(valid))).toBe(true)
    expect(recipeJsonHasContent(json({ ingredients: [{ name: 'Salt' }] }))).toBe(true)
    expect(recipeJsonHasContent(json({ instructions: [{ text: 'Mince' }] }))).toBe(true)
  })

  it('is false for an empty recipe section that was opened but left blank', () => {
    expect(recipeJsonHasContent(json({ ingredients: [], instructions: [] }))).toBe(false)
    expect(recipeJsonHasContent(json({}))).toBe(false)
  })

  it('is false for unparseable or null input rather than throwing', () => {
    expect(recipeJsonHasContent('{not json')).toBe(false)
    expect(recipeJsonHasContent('')).toBe(false)
    expect(recipeJsonHasContent('null')).toBe(false)
  })
})
