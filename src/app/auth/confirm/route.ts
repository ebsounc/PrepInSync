import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, updateProfile } from '@/lib/db/queries/profiles'
import { getPendingInviteByEmail, markInviteAccepted } from '@/lib/db/queries/invites'
import { isInvitableRole } from '@/lib/auth/roles'
import { isValidAccent } from '@/lib/appearance'
import { APPEARANCE_COOKIE_OPTS } from '@/lib/appearance-cookies'

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

  let destination = '/login'
  if (type === 'email') {
    // Email confirmation after signup — proceed to restaurant onboarding
    destination = '/onboarding'
  } else if (type === 'recovery') {
    // Password reset link
    destination = '/reset-password'
  } else if (type === 'invite') {
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
    destination = '/set-password'
  }

  const res = NextResponse.redirect(new URL(destination, request.url))

  // Seed the appearance cookies from this user's profile. These branches create a
  // session without going through loginAction, so on a shared device a stale theme
  // cookie from a previous user would otherwise be treated as authoritative by the
  // root layout. Set on the response directly (reliable for route-handler redirects).
  const profile = await getProfileByUserId(user.id)
  if (profile) {
    res.cookies.set('theme', profile.theme, APPEARANCE_COOKIE_OPTS)
    const accent = isValidAccent(profile.accentColor) ? profile.accentColor : null
    if (accent) res.cookies.set('accent', accent, APPEARANCE_COOKIE_OPTS)
    else res.cookies.delete({ name: 'accent', path: '/' })
  }

  return res
}
