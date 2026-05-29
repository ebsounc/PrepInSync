import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { PasswordForm } from '@/components/auth/password-form'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=session_expired')
  }

  return (
    <AuthFormWrapper title="Set new password">
      <PasswordForm submitLabel="Update password" />
    </AuthFormWrapper>
  )
}
