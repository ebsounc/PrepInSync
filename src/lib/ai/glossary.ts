// Kitchen-Spanish glossary injected into translation prompts for consistency.
// Hand-derived from docs/translation-validation.md (Sections 1–2). The terms are
// the source of truth for preferred kitchen translations and apply in BOTH
// directions (en↔es). Service slang (Section 4) is intentionally excluded — it
// doesn't appear in prep content and doesn't translate cleanly.
//
// Kept as a single stable string constant so it can be sent as a cached prompt
// prefix (Anthropic prompt caching) — see src/lib/ai/index.ts.
export const KITCHEN_GLOSSARY = `KITCHEN GLOSSARY (English ⇄ Spanish). Use these exact preferred terms in both directions.

TECHNIQUES
- mince ⇄ picar muy fino   (NOT "triturar" — that implies a paste)
- dice ⇄ cortar en cubitos (small) / cortar en cubos (large)
- chop ⇄ picar
- sauté ⇄ saltear
- simmer ⇄ cocinar a fuego lento
- fold (in) ⇄ incorporar suavemente   (NOT "doblar" — that means folding a napkin)
- whisk (verb) ⇄ batir
- whisk (tool) ⇄ batidor
- deglaze ⇄ desglasar
- blanch ⇄ blanquear / escaldar
- sear ⇄ sellar   (vs. "dorar" = brown)
- reduce ⇄ reducir
- strain ⇄ colar
- season ⇄ sazonar
- marinate ⇄ marinar
- portion ⇄ porcionar
- brunoise ⇄ brunoise
- chiffonade ⇄ chifonada
- julienne ⇄ cortar en juliana

EQUIPMENT / LOCATIONS
- walk-in (cooler) ⇄ cuarto frío   (NEVER "caminar adentro")
- reach-in / fridge ⇄ refrigerador / nevera
- freezer ⇄ congelador
- cutting board ⇄ tabla de cortar
- sheet pan ⇄ charola
- pot ⇄ olla
- pan / skillet ⇄ sartén
- container (deli/Cambro) ⇄ recipiente
- quart container ⇄ recipiente de un cuarto

INGREDIENTS
- onion ⇄ cebolla
- garlic ⇄ ajo
- bell pepper ⇄ pimiento
- chicken breast ⇄ pechuga de pollo
- ground beef ⇄ carne molida
- heavy cream ⇄ crema espesa
- stock / broth ⇄ caldo
- sauce ⇄ salsa
- dressing ⇄ aderezo
- cilantro ⇄ cilantro

MEASUREMENTS
- pound (lb) ⇄ libra
- ounce (oz) ⇄ onza
- cup ⇄ taza
- tablespoon ⇄ cucharada
- teaspoon ⇄ cucharadita
- quart ⇄ cuarto
- gallon ⇄ galón
- case ⇄ caja
- a pinch ⇄ una pizca
- to taste ⇄ al gusto
- approximately / about ⇄ como`

export type GlossaryOverride = {
  sourceTerm: string
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  preferredTranslation: string
}

// Renders a restaurant's user-confirmed overrides as extra glossary lines,
// scoped to the active translation direction. These are appended AFTER the
// static glossary and take precedence — they're how a restaurant locks in its
// own preferred terms. Returns '' when there are none (so the prompt stays a
// stable, cacheable prefix for restaurants without overrides).
export function formatOverrides(
  overrides: GlossaryOverride[],
  sourceLanguage: 'en' | 'es',
  targetLanguage: 'en' | 'es'
): string {
  const relevant = overrides.filter(
    (o) => o.sourceLanguage === sourceLanguage && o.targetLanguage === targetLanguage
  )
  if (relevant.length === 0) return ''
  const lines = relevant.map((o) => `- ${o.sourceTerm} → ${o.preferredTranslation}`)
  return `RESTAURANT OVERRIDES (these take precedence over the glossary above):\n${lines.join('\n')}`
}
