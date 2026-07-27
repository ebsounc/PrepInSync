// Client-side validation for the auth and invite forms.
//
// These forms set `noValidate` and validate here instead of leaning on the browser.
// Two reasons that matter for this app:
//   1. The browser's own message ("Please fill out this field") is localized to the
//      BROWSER's language, not the user's `preferred_language` / `lang` cookie — so a
//      Spanish-speaking cook on an English phone got English errors.
//   2. Native validation blocks submission before React sees it, so nothing could set
//      `aria-invalid`, which is what drives the red error styling already defined in
//      components/ui/input.tsx.
//
// `Dict` is imported type-only, so no dictionary enters the client bundle (see
// lib/i18n/client.tsx for the same constraint).
import type { Dict } from '@/lib/i18n'

/** Field name → resolved, already-translated message. */
export type FieldErrors = Record<string, string>

// Deliberately permissive: real address validation is impossible client-side, and
// Supabase is the authority. This only catches obvious typos before a round-trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 8

export function requiredError(value: string, dict: Dict): string | undefined {
  return value.trim() ? undefined : dict.errors.validation.required
}

export function emailError(value: string, dict: Dict): string | undefined {
  if (!value.trim()) return dict.errors.validation.required
  return EMAIL_PATTERN.test(value.trim()) ? undefined : dict.errors.validation.emailInvalid
}

export function passwordError(value: string, dict: Dict): string | undefined {
  if (!value) return dict.errors.validation.required
  return value.length >= PASSWORD_MIN_LENGTH
    ? undefined
    : dict.errors.validation.passwordTooShort
}

export function confirmPasswordError(
  value: string,
  password: string,
  dict: Dict
): string | undefined {
  if (!value) return dict.errors.validation.required
  return value === password ? undefined : dict.errors.validation.passwordsNoMatch
}

/** Drops undefined entries so the caller can test emptiness to decide whether to submit. */
export function collectErrors(
  candidates: Record<string, string | undefined>
): FieldErrors {
  const errors: FieldErrors = {}
  for (const [field, message] of Object.entries(candidates)) {
    if (message) errors[field] = message
  }
  return errors
}
