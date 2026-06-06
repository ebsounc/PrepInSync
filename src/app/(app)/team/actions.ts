'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getProfileByUserId,
  setCanCreateLists,
  setProfileActive,
  setProfileRole,
} from '@/lib/db/queries/profiles'
import { createInvite, deleteInvite } from '@/lib/db/queries/invites'
import { getOrigin } from '@/lib/get-origin'
import {
  isManagementRole,
  isInvitableRole,
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

// Resolves the caller as a management user and the target as a member of the same
// restaurant. Shared guard for the per-person roster toggles below.
async function requireManagerAndTarget(targetId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' as const }

  const caller = await getProfileByUserId(user.id)
  if (!caller || !caller.restaurantId || !caller.isActive || !isManagementRole(caller.role)) {
    return { error: 'You do not have permission to manage the team.' as const }
  }

  const parsedId = z.string().uuid().safeParse(targetId)
  if (!parsedId.success) return { error: 'Invalid team member.' as const }

  const target = await getProfileByUserId(parsedId.data)
  if (!target || target.restaurantId !== caller.restaurantId) {
    return { error: 'Team member not found.' as const }
  }
  return { caller, target, restaurantId: caller.restaurantId }
}

export async function setCanCreateListsAction(
  targetId: string,
  value: boolean
): Promise<{ error?: string }> {
  const ctx = await requireManagerAndTarget(targetId)
  if ('error' in ctx) return { error: ctx.error }

  // The owner always retains list creation — don't let it be toggled off.
  if (ctx.target.role === 'owner') {
    return { error: "You can't change the owner's permissions." }
  }
  // Don't let a manager revoke their own list access and lock themselves out.
  if (ctx.target.id === ctx.caller.id) {
    return { error: "You can't change your own list permission." }
  }
  await setCanCreateLists(ctx.target.id, ctx.restaurantId, value)
  revalidatePath('/team')
  return {}
}

export async function setRoleAction(
  targetId: string,
  role: string
): Promise<{ error?: string }> {
  const ctx = await requireManagerAndTarget(targetId)
  if ('error' in ctx) return { error: ctx.error }

  // Owner's role is fixed; changing it would be an ownership transfer (out of scope).
  if (ctx.target.role === 'owner') {
    return { error: "You can't change the owner's role." }
  }
  // Don't let a manager demote themselves and lose team access.
  if (ctx.target.id === ctx.caller.id) {
    return { error: "You can't change your own role." }
  }
  // isInvitableRole is exactly the assignable set (all roles except owner).
  if (!isInvitableRole(role)) {
    return { error: 'Pick a valid role.' }
  }
  // Reset list-creation permission to the new role's default on a role change.
  await setProfileRole(ctx.target.id, ctx.restaurantId, role, defaultCanCreateLists(role))
  revalidatePath('/team')
  return {}
}

export async function setActiveAction(
  targetId: string,
  value: boolean
): Promise<{ error?: string }> {
  const ctx = await requireManagerAndTarget(targetId)
  if ('error' in ctx) return { error: ctx.error }

  if (ctx.target.id === ctx.caller.id) {
    return { error: "You can't deactivate yourself." }
  }
  if (ctx.target.role === 'owner') {
    return { error: "You can't deactivate the owner." }
  }
  await setProfileActive(ctx.target.id, ctx.restaurantId, value)
  revalidatePath('/team')
  return {}
}
