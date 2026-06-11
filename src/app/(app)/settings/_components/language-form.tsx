'use client'

import { useActionState, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { updateLanguageAction, type SettingsState } from '../actions'
import { useT } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'

export function LanguageForm({ current }: { current: 'en' | 'es' }) {
  const { dict } = useT()
  const [state, action, isPending] = useActionState<SettingsState, FormData>(
    updateLanguageAction,
    null
  )
  const [language, setLanguage] = useState<'en' | 'es'>(current)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.success && (
        <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
          {dict.common.saved}
        </div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <input type="hidden" name="language" value={language} />
      <div className="grid grid-cols-2 gap-2">
        {(['en', 'es'] as const).map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={language === code}
            onClick={() => setLanguage(code)}
            className={
              'min-h-[48px] rounded-lg border text-base font-medium transition-colors ' +
              (language === code
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50')
            }
          >
            {code === 'en' ? dict.languages.en : dict.languages.es}
          </button>
        ))}
      </div>
      <Button
        type="submit"
        className="min-h-[48px] text-base"
        disabled={isPending || language === current}
      >
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.settings.saveLanguage}
      </Button>
    </form>
  )
}
