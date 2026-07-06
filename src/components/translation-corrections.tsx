'use client'

import { useState, useTransition } from 'react'
import { LanguagesIcon, Loader2Icon } from 'lucide-react'
import { submitTranslationOverrideAction } from '@/app/(app)/_actions/translations'
import { useT } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type Correctable = {
  entityType: 'prep_item' | 'prep_list' | 'prep_list_entry' | 'restaurant_unit' | 'recipe'
  entityId: string
  field: string
  label: string
  sourceText: string
  sourceLanguage: 'en' | 'es'
  currentTranslation: string
}

// One per-page place to fix a wrong translation: pick the term that reads wrong,
// type the correction. Writes a restaurant glossary override and regenerates the
// cached translation. Renders nothing when the page has no translated text to fix.
export function TranslationCorrections({
  items,
  targetLanguage,
}: {
  items: Correctable[]
  targetLanguage: 'en' | 'es'
}) {
  const { dict, t } = useT()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (items.length === 0) return null

  function choose(index: number) {
    setSelected(index)
    setValue(items[index]?.currentTranslation ?? '')
    setError(null)
    setDone(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          choose(0)
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <LanguagesIcon className="size-4" />
        {dict.corrections.fix}
      </button>
    )
  }

  const current = items[selected]

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <LanguagesIcon className="size-4" /> {dict.corrections.fix}
      </div>
      {done && (
        <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          {dict.corrections.saved}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.corrections.whichWrong}</label>
        <select
          value={selected}
          onChange={(e) => choose(Number(e.target.value))}
          className="min-h-[48px] rounded-lg border bg-background px-3 text-base"
        >
          {items.map((it, i) => (
            <option key={`${it.entityType}:${it.entityId}:${it.field}`} value={i}>
              {it.label}: {it.currentTranslation}
            </option>
          ))}
        </select>
      </div>
      {current && (
        <p className="text-xs text-muted-foreground">
          {t(dict.corrections.original, {
            lang: current.sourceLanguage.toUpperCase(),
            text: current.sourceText,
          })}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.corrections.correctTranslation}</label>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={500}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          className="min-h-[44px]"
          disabled={pending || !value.trim() || !current}
          onClick={() =>
            start(async () => {
              if (!current) return
              const res = await submitTranslationOverrideAction({
                entityType: current.entityType,
                entityId: current.entityId,
                field: current.field,
                sourceText: current.sourceText,
                sourceLanguage: current.sourceLanguage,
                targetLanguage,
                preferredTranslation: value.trim(),
              })
              if (res.error) setError(res.error)
              else {
                setError(null)
                setDone(true)
              }
            })
          }
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : dict.corrections.saveCorrection}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={() => setOpen(false)}
        >
          {dict.common.close}
        </Button>
      </div>
    </div>
  )
}
