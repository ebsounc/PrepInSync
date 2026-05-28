export type TranslateOptions = {
  text: string
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  context?: string
}

// Placeholder — implemented in Phase 3 (translation layer).
// All LLM calls must go through this module; no direct API calls from
// components or route handlers.
export async function translate(_options: TranslateOptions): Promise<string> {
  throw new Error('translate() not yet implemented')
}
