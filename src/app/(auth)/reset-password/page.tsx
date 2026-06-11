import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { PasswordForm } from '@/components/auth/password-form'
import { getDictionary } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=session_expired')
  }

  const dict = getDictionary(await getCookieLang())
  return (
    <AuthFormWrapper title={dict.auth.resetTitle}>
      <PasswordForm submitLabel={dict.auth.updatePassword} />
    </AuthFormWrapper>
  )
}
