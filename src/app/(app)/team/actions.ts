'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { createInvite, deleteInvite } from '@/lib/db/queries/invites'
import { getOrigin } from '@/lib/get-origin'
import {
  isManagementRole,
  defaultCanCreateLists,
  INVITABLE_ROLES,
  type ProfileRole,
} from '@/lib/auth/roles'

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(INVITABLE_ROLES, { message: 'Select a valid role' }),
})

type InviteState = { error?: string; success?: boolean; invitedEmail?: string } | null

export async function inviteTeamMemberAction(
  prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to invite team members.' }
  }

  const callerProfile = await getProfileByUserId(user.id)

  if (!callerProfile || !isManagementRole(callerProfile.role) || !callerProfile.restaurantId) {
    return { error: 'You do not have permission to invite team members.' }
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, firstName, lastName, role } = parsed.data
  const canCreateLists = defaultCanCreateLists(role as ProfileRole)
  const origin = await getOrigin()
  const adminClient = createAdminClient()

  // Record the invite intent server-side. restaurant/role/permission are read
  // back from this row on acceptance — never from user-editable user_metadata.
  const invite = await createInvite({
    email,
    restaurantId: callerProfile.restaurantId,
    role,
    canCreateLists,
    invitedBy: callerProfile.id,
  })

  // Only first/last name go in metadata (display-only; the signup trigger reads
  // them). Nothing authorization-relevant is placed there.
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: firstName,
      last_name: lastName,
      preferred_language: 'en',
    },
    redirectTo: `${origin}/auth/confirm`,
  })

  if (error) {
    await deleteInvite(invite.id)
    // Supabase returns an error if the user already exists
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'An account with that email already exists.' }
    }
    return { error: 'Failed to send invite. Please try again.' }
  }

  return { success: true, invitedEmail: email }
}
