'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/client'
import { ACCENTS, applyAccent, type Theme } from '@/lib/appearance'
import { Button } from '@/components/ui/button'
import { updateAppearanceAction } from '../actions'
import type { SettingsState } from '../actions'

// Appearance persists to the user's profile (so it follows them across devices) via
// updateAppearanceAction, mirroring the language form. Selections apply to the DOM
// immediately for a live preview; Save persists them. localStorage is kept in sync on
// save only as the logged-out fallback (the no-flash script prefers the cookie).

function applyTheme(t: Theme) {
  const dark =
    t === 'dark' ||
    (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function AppearanceForm({
  currentTheme,
  currentAccent,
}: {
  currentTheme: Theme
  currentAccent: string | null
}) {
  const { dict } = useT()
  const [state, action, isPending] = useActionState<SettingsState, FormData>(
    updateAppearanceAction,
    null
  )
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const [accent, setAccent] = useState<string | null>(currentAccent)

  // Sync localStorage on a successful save (logged-out fallback). Read via refs so the
  // effect can key on `state` alone and never fire on an unsaved selection change.
  const themeRef = useRef(theme)
  const accentRef = useRef(accent)
  themeRef.current = theme
  accentRef.current = accent
  useEffect(() => {
    if (!state?.success) return
    localStorage.setItem('theme', themeRef.current)
    if (accentRef.current) localStorage.setItem('pis-accent', accentRef.current)
    else localStorage.removeItem('pis-accent')
  }, [state])

  function chooseTheme(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  function chooseAccent(value: string | null) {
    setAccent(value)
    applyAccent(value)
  }

  const dirty = theme !== currentTheme || accent !== currentAccent

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: dict.settings.themeLight },
    { value: 'dark', label: dict.settings.themeDark },
    { value: 'system', label: dict.settings.themeSystem },
  ]

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="accent" value={accent ?? ''} />

      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state?.success && (
        <p className="text-sm text-muted-foreground">{dict.common.saved}</p>
      )}

      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{dict.settings.themeLabel}</span>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => chooseTheme(value)}
              className={cn(
                'min-h-[48px] rounded-lg border text-base font-medium transition-colors',
                theme === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{dict.settings.accentLabel}</span>
        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              aria-label={a.key}
              aria-pressed={accent === a.value}
              onClick={() => chooseAccent(a.value)}
              className="size-9 rounded-full border transition-transform hover:scale-105"
              style={{
                background: a.swatch,
                outline: accent === a.value ? '2px solid var(--foreground)' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
          <label
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border text-xs text-muted-foreground"
            title={dict.settings.accentCustom}
          >
            +
            <input
              type="color"
              className="sr-only"
              onChange={(e) => chooseAccent(e.target.value)}
            />
          </label>
        </div>
      </div>

      <Button type="submit" className="min-h-[48px] self-start" disabled={isPending || !dirty}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.settings.saveAppearance}
      </Button>
    </form>
  )
}
