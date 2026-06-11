'use client'

import { createContext, useContext } from 'react'
import { interpolate } from './interpolate'
import type { Dict } from './en'
import type { Lang } from './index'

// Dict/Lang are imported TYPE-ONLY (erased at build), so client code carries no
// runtime dependency on en.ts/es.ts — neither dictionary is bundled. The active,
// already-resolved dict travels from the server layout as a plain-string prop.
type LanguageContextValue = { dict: Dict; lang: Lang }

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  dict,
  lang,
  children,
}: LanguageContextValue & { children: React.ReactNode }) {
  return (
    <LanguageContext.Provider value={{ dict, lang }}>{children}</LanguageContext.Provider>
  )
}

// Returns the active dictionary, the current language, and the `t` interpolation
// helper for parameterized strings: t(dict.dashboard.progress, { done, total }).
export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within a LanguageProvider')
  return { dict: ctx.dict, lang: ctx.lang, t: interpolate }
}
