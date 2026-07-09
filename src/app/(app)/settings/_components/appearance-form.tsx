'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/client'

// Appearance is a per-device preference stored in localStorage and applied via CSS
// vars / the .dark class (the no-flash script in the root layout re-applies it on
// load). Green is the baked default — the "Green" accent below just clears any
// override back to it.
const ACCENTS: { key: string; value: string | null; swatch: string }[] = [
  { key: 'green', value: null, swatch: 'oklch(0.58 0.15 152)' },
  { key: 'teal', value: 'oklch(0.62 0.11 190)', swatch: 'oklch(0.62 0.11 190)' },
  { key: 'sky', value: 'oklch(0.62 0.13 230)', swatch: 'oklch(0.62 0.13 230)' },
  { key: 'blue', value: 'oklch(0.55 0.19 255)', swatch: 'oklch(0.55 0.19 255)' },
  { key: 'indigo', value: 'oklch(0.5 0.21 272)', swatch: 'oklch(0.5 0.21 272)' },
  { key: 'violet', value: 'oklch(0.56 0.22 300)', swatch: 'oklch(0.56 0.22 300)' },
  { key: 'rose', value: 'oklch(0.6 0.2 12)', swatch: 'oklch(0.6 0.2 12)' },
  { key: 'amber', value: 'oklch(0.72 0.16 70)', swatch: 'oklch(0.72 0.16 70)' },
]

function applyAccent(value: string | null) {
  const root = document.documentElement
  for (const prop of ['--primary', '--ring', '--sidebar-primary']) {
    if (value) root.style.setProperty(prop, value)
    else root.style.removeProperty(prop)
  }
}

export function AppearanceForm() {
  const { dict } = useT()
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)
  const [accent, setAccent] = useState<string | null>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    setAccent(localStorage.getItem('pis-accent'))
    setMounted(true)
  }, [])

  function chooseTheme(nextDark: boolean) {
    setDark(nextDark)
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('theme', nextDark ? 'dark' : 'light')
  }

  function chooseAccent(value: string | null) {
    setAccent(value)
    applyAccent(value)
    if (value) localStorage.setItem('pis-accent', value)
    else localStorage.removeItem('pis-accent')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{dict.settings.themeLabel}</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { d: false, label: dict.settings.themeLight },
            { d: true, label: dict.settings.themeDark },
          ].map(({ d, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={mounted && dark === d}
              onClick={() => chooseTheme(d)}
              className={cn(
                'min-h-[48px] rounded-lg border text-base font-medium transition-colors',
                mounted && dark === d
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
              aria-pressed={mounted && accent === a.value}
              onClick={() => chooseAccent(a.value)}
              className="size-9 rounded-full border transition-transform hover:scale-105"
              style={{
                background: a.swatch,
                outline: mounted && accent === a.value ? '2px solid var(--foreground)' : 'none',
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
    </div>
  )
}
