import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getDictionary } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileByUserId(user.id)

  // Already onboarded — skip to the app
  if (profile?.restaurantId) {
    redirect('/dashboard')
  }

  const dict = getDictionary(profile?.preferredLanguage ?? 'en')

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight">{dict.onboarding.brand}</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{dict.onboarding.title}</CardTitle>
            <CardDescription>{dict.onboarding.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
