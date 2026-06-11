import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { getDictionary } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'
import { ForgotPasswordForm } from './_components/forgot-password-form'

export default async function ForgotPasswordPage() {
  const dict = getDictionary(await getCookieLang())
  return (
    <AuthFormWrapper title={dict.auth.forgotTitle} description={dict.auth.forgotDesc}>
      <ForgotPasswordForm />
    </AuthFormWrapper>
  )
}
