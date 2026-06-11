import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { getDictionary } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'
import { SignupForm } from './_components/signup-form'

export default async function SignupPage() {
  const dict = getDictionary(await getCookieLang())
  return (
    <AuthFormWrapper title={dict.auth.signupTitle} description={dict.auth.signupDesc}>
      <SignupForm />
    </AuthFormWrapper>
  )
}
