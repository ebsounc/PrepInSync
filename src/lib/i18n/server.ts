import 'server-only'
import { cookies } from 'next/headers'
import { asLang, getDictionary, type Dict, type Lang } from './index'

// Reads the `lang` cookie (default 'en'). Used for the root <html lang> and for
// logged-out auth pages/actions, which have no profile to read preferred_language
// from. Logged-in (app) code uses profile.preferredLanguage instead.
export async function getCookieLang(): Promise<Lang> {
  const store = await cookies()
  return asLang(store.get('lang')?.value)
}

// Persists the language for logged-out pages (root <html lang> + auth screens).
// Only callable from a server action / route handler. Value is constrained to a Lang.
export async function setCookieLang(lang: Lang): Promise<void> {
  const store = await cookies()
  store.set('lang', lang, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

// Dictionary for a server action's error messages: the caller's profile language
// when known, otherwise the cookie language. Lets actions return localized strings
// while keeping the existing `{ error: string }` contract.
export async function getActionDict(preferred?: Lang | null): Promise<Dict> {
  return getDictionary(preferred ?? (await getCookieLang()))
}
