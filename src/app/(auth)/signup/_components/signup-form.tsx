'use client'

import { useRef, useState, useActionState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon, Loader2Icon, MailCheckIcon } from 'lucide-react'
import { signupAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignupForm() {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(signupAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const passwordRef = useRef<HTMLInputElement>(null)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MailCheckIcon className="size-12 text-primary" />
        <div>
          <p className="font-medium">{dict.auth.checkEmailTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{dict.auth.checkEmailBody}</p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName">
          <FieldLabel>{dict.team.firstName}</FieldLabel>
          <Input
            type="text"
            name="firstName"
            required
            placeholder={dict.team.firstNamePlaceholder}
            autoComplete="given-name"
            autoFocus
          />
          <FieldError />
        </Field>
        <Field name="lastName">
          <FieldLabel>{dict.team.lastName}</FieldLabel>
          <Input
            type="text"
            name="lastName"
            required
            placeholder={dict.team.lastNamePlaceholder}
            autoComplete="family-name"
          />
          <FieldError />
        </Field>
      </div>
      <Field name="email">
        <FieldLabel>{dict.auth.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          placeholder={dict.auth.emailPlaceholder}
          autoComplete="email"
        />
        <FieldError />
      </Field>
      <Field name="password">
        <FieldLabel>{dict.auth.password}</FieldLabel>
        <div className="relative">
          <Input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            minLength={8}
            placeholder={dict.auth.minChars}
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? dict.auth.hidePassword : dict.auth.showPassword}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        <FieldError />
      </Field>
      <Field name="confirmPassword">
        <FieldLabel>{dict.auth.confirmPassword}</FieldLabel>
        <Input
          type="password"
          name="confirmPassword"
          required
          placeholder={dict.auth.repeatPassword}
          autoComplete="new-password"
          onInput={(e) => {
            e.currentTarget.setCustomValidity(
              e.currentTarget.value !== (passwordRef.current?.value ?? '')
                ? dict.auth.passwordsNoMatch
                : ''
            )
          }}
        />
        <FieldError />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.auth.languageLabel}</label>
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
        <p className="text-xs text-muted-foreground">{dict.auth.languageHelp}</p>
      </div>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.auth.createAccount}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.haveAccount}{' '}
        <Link href="/login" className="text-primary hover:underline">
          {dict.auth.signIn}
        </Link>
      </p>
    </form>
  )
}
