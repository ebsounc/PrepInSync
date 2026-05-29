import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { SignupForm } from './_components/signup-form'

export default function SignupPage() {
  return (
    <AuthFormWrapper title="Create your account" description="Set up your restaurant on KitchenPrep">
      <SignupForm />
    </AuthFormWrapper>
  )
}
