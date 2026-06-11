import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { getDictionary } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'
import { LoginForm } from './_components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const dict = getDictionary(await getCookieLang())
  const errorMessages: Record<string, string> = {
    link_expired: dict.auth.linkExpired,
    invalid_link: dict.auth.linkInvalid,
    session_expired: dict.auth.sessionExpired,
  }
  const message = error ? errorMessages[error] : undefined

  return (
    <AuthFormWrapper title={dict.auth.loginTitle} description={dict.auth.loginDesc}>
      {message && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {message}
        </div>
      )}
      <LoginForm />
    </AuthFormWrapper>
  )
}
