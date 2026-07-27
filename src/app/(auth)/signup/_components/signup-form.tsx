'use client'

import { startTransition, useRef, useState, useTransition, useActionState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon, Loader2Icon, MailCheckIcon } from 'lucide-react'
import { signupAction, setAuthLanguageAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import {
  collectErrors,
  confirmPasswordError,
  emailError,
  passwordError,
  requiredError,
  type FieldErrors,
} from '@/lib/form-validation'
import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { Field, FieldLabel, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignupForm() {
  const { dict, lang } = useT()
  const [state, action, isPending] = useActionState(signupAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [switchingLang, startLangSwitch] = useTransition()
  const passwordRef = useRef<HTMLInputElement>(null)

  // The success state renders its own header rather than sitting under the form's
  // "Create your account" title, which contradicted the "check your email" message.
  if (state?.success) {
    return (
      <AuthFormWrapper title={dict.auth.checkEmailTitle}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <MailCheckIcon className="size-12 text-primary" />
          <p className="text-sm text-muted-foreground">{dict.auth.checkEmailBody}</p>
        </div>
      </AuthFormWrapper>
    )
  }

  // Validating here (with noValidate on the form) rather than letting the browser do it:
  // the native messages are localized to the browser, not to the user's chosen language.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const get = (name: string) => String(data.get(name) ?? '')
    const password = get('password')

    const found = collectErrors({
      firstName: requiredError(get('firstName'), dict),
      lastName: requiredError(get('lastName'), dict),
      email: emailError(get('email'), dict),
      password: passwordError(password, dict),
      confirmPassword: confirmPasswordError(get('confirmPassword'), password, dict),
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    // Dispatching manually instead of via <form action> is also what keeps typed values
    // on screen when the server returns an error: React 19 resets any uncontrolled form
    // whose `action` is a function, as soon as the action settles. The transition is
    // required — without it `isPending` never flips and a redirecting action throws.
    startTransition(() => action(data))
  }

  // Clears a field's error as soon as the user starts correcting it, so the red state
  // doesn't linger while they type.
  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })

  function chooseLanguage(code: 'en' | 'es') {
    if (code === lang) return
    // Messages already on screen were resolved against the OLD dictionary and would
    // otherwise sit there in the previous language. Re-submitting re-validates in the
    // new one, so just clear them.
    setErrors({})
    startLangSwitch(() => setAuthLanguageAction(code))
  }

  return (
    <AuthFormWrapper title={dict.auth.signupTitle} description={dict.auth.signupDesc}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {state?.error && (
          <div
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}

        {/* First, so the rest of signup is read in the chosen language. Selecting writes
            the lang cookie and revalidates, which re-renders this page server-side. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{dict.auth.languageLabel}</span>
          <input type="hidden" name="language" value={lang} />
          <div className="grid grid-cols-2 gap-2">
            {(['en', 'es'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                disabled={switchingLang}
                onClick={() => chooseLanguage(code)}
                className={
                  'min-h-[48px] rounded-lg border text-base font-medium transition-colors disabled:opacity-60 ' +
                  (lang === code
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

        <div className="grid grid-cols-2 gap-3">
          <Field name="firstName">
            <FieldLabel required>{dict.team.firstName}</FieldLabel>
            <Input
              type="text"
              name="firstName"
              required
              aria-invalid={Boolean(errors.firstName)}
              onInput={() => clearError('firstName')}
              placeholder={dict.team.firstNamePlaceholder}
              autoComplete="given-name"
              autoFocus
            />
            {errors.firstName && <FieldMessage>{errors.firstName}</FieldMessage>}
          </Field>
          <Field name="lastName">
            <FieldLabel required>{dict.team.lastName}</FieldLabel>
            <Input
              type="text"
              name="lastName"
              required
              aria-invalid={Boolean(errors.lastName)}
              onInput={() => clearError('lastName')}
              placeholder={dict.team.lastNamePlaceholder}
              autoComplete="family-name"
            />
            {errors.lastName && <FieldMessage>{errors.lastName}</FieldMessage>}
          </Field>
        </div>

        <Field name="email">
          <FieldLabel required>{dict.auth.email}</FieldLabel>
          <Input
            type="email"
            name="email"
            required
            aria-invalid={Boolean(errors.email)}
            onInput={() => clearError('email')}
            placeholder={dict.auth.emailPlaceholder}
            autoComplete="email"
          />
          {errors.email && <FieldMessage>{errors.email}</FieldMessage>}
        </Field>

        <Field name="password">
          <FieldLabel required>{dict.auth.password}</FieldLabel>
          <div className="relative">
            <Input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              aria-invalid={Boolean(errors.password)}
              onInput={() => clearError('password')}
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
              {/* Icon reflects the field's CURRENT state (open eye = text is visible);
                  the aria-label states the action, which is what a screen reader wants. */}
              {showPassword ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
            </button>
          </div>
          {errors.password && <FieldMessage>{errors.password}</FieldMessage>}
        </Field>

        <Field name="confirmPassword">
          <FieldLabel required>{dict.auth.confirmPassword}</FieldLabel>
          <Input
            type="password"
            name="confirmPassword"
            required
            aria-invalid={Boolean(errors.confirmPassword)}
            onInput={() => clearError('confirmPassword')}
            placeholder={dict.auth.repeatPassword}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <FieldMessage>{errors.confirmPassword}</FieldMessage>}
        </Field>

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
    </AuthFormWrapper>
  )
}
