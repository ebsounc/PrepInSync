import { SignupForm } from './_components/signup-form'

// The form owns its AuthFormWrapper so the post-signup "check your email" state can
// render its own header instead of staying under "Create your account".
export default function SignupPage() {
  return <SignupForm />
}
