import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { ForgotPasswordForm } from './_components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthFormWrapper
      title="Reset your password"
      description="Enter your email and we'll send you a reset link"
    >
      <ForgotPasswordForm />
    </AuthFormWrapper>
  )
}
