import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// TODO: replace with a real nav shell — Phase 1 (auth)
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
