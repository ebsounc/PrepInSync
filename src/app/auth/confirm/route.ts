import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/queries/profiles'
import { getPendingInviteByEmail, markInviteAccepted } from '@/lib/db/queries/invites'
import { isInvitableRole } from '@/lib/auth/roles'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (type === 'email') {
    // Email confirmation after signup — proceed to restaurant onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (type === 'recovery') {
    // Password reset link
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  if (type === 'invite') {
    // Invite acceptance — apply the restaurant/role from the trusted invites
    // row (matched on the verified email), not from user-editable metadata.
    if (user.email) {
      const invite = await getPendingInviteByEmail(user.email)
      if (invite && isInvitableRole(invite.role)) {
        await updateProfile(user.id, {
          restaurantId: invite.restaurantId,
          role: invite.role,
          canCreateLists: invite.canCreateLists,
        })
        await markInviteAccepted(invite.id)
      }
    }

    return NextResponse.redirect(new URL('/set-password', request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
