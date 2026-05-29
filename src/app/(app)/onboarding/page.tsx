import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
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

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight">KitchenPrep</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up your restaurant</CardTitle>
            <CardDescription>
              A few quick details and you&apos;re ready to go.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
