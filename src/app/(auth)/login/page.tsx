import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { LoginForm } from './_components/login-form'

const ERROR_MESSAGES: Record<string, string> = {
  link_expired: 'That link has expired. Please sign in or request a new one.',
  invalid_link: 'That link is invalid. Please sign in or request a new one.',
  session_expired: 'Your session expired. Please sign in again.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = error ? ERROR_MESSAGES[error] : undefined

  return (
    <AuthFormWrapper title="Welcome back" description="Sign in to your account">
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
