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
import { getDictionary, resolveKey } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

const inviteSchema = z.object({
  email: z.string().email('errors.auth.invalidEmail'),
  firstName: z.string().min(1, 'errors.auth.firstNameRequired'),
  lastName: z.string().min(1, 'errors.auth.lastNameRequired'),
  role: z.enum(INVITABLE_ROLES, { message: 'errors.team.selectRole' }),
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
    return { error: (await getActionDict()).errors.team.signInToInvite }
  }

  const callerProfile = await getProfileByUserId(user.id)

  if (!callerProfile || !isManagementRole(callerProfile.role) || !callerProfile.restaurantId) {
    return {
      error: (await getActionDict(callerProfile?.preferredLanguage)).errors.team.noPermissionInvite,
    }
  }

  const dict = getDictionary(callerProfile.preferredLanguage)
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: resolveKey(dict, parsed.error.issues[0].message) }
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
      // Default the invitee to the inviter's language (the restaurant's working
      // language is a better guess than always English); they can change it.
      preferred_language: callerProfile.preferredLanguage,
    },
    redirectTo: `${origin}/auth/confirm`,
  })

  if (error) {
    await deleteInvite(invite.id)
    // Supabase returns an error if the user already exists
    if (error.message.toLowerCase().includes('already')) {
      return { error: dict.errors.team.emailExists }
    }
    return { error: dict.errors.team.inviteFailed }
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
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const caller = await getProfileByUserId(user.id)
  if (!caller || !caller.restaurantId || !caller.isActive || !isManagementRole(caller.role)) {
    return {
      error: (await getActionDict(caller?.preferredLanguage)).errors.team.noPermissionManage,
    }
  }

  const dict = getDictionary(caller.preferredLanguage)
  const parsedId = z.string().uuid().safeParse(targetId)
  if (!parsedId.success) return { error: dict.errors.team.invalidMember }

  const target = await getProfileByUserId(parsedId.data)
  if (!target || target.restaurantId !== caller.restaurantId) {
    return { error: dict.errors.team.memberNotFound }
  }
  return { caller, target, restaurantId: caller.restaurantId, dict }
}

export async function setCanCreateListsAction(
  targetId: string,
  value: boolean
): Promise<{ error?: string }> {
  const ctx = await requireManagerAndTarget(targetId)
  if ('error' in ctx) return { error: ctx.error }

  // The owner always retains list creation — don't let it be toggled off.
  if (ctx.target.role === 'owner') {
    return { error: ctx.dict.errors.team.cantChangeOwnerPerms }
  }
  // Don't let a manager revoke their own list access and lock themselves out.
  if (ctx.target.id === ctx.caller.id) {
    return { error: ctx.dict.errors.team.cantChangeOwnPerms }
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
    return { error: ctx.dict.errors.team.cantChangeOwnerRole }
  }
  // Don't let a manager demote themselves and lose team access.
  if (ctx.target.id === ctx.caller.id) {
    return { error: ctx.dict.errors.team.cantChangeOwnRole }
  }
  // isInvitableRole is exactly the assignable set (all roles except owner).
  if (!isInvitableRole(role)) {
    return { error: ctx.dict.errors.team.pickRole }
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
    return { error: ctx.dict.errors.team.cantDeactivateSelf }
  }
  if (ctx.target.role === 'owner') {
    return { error: ctx.dict.errors.team.cantDeactivateOwner }
  }
  await setProfileActive(ctx.target.id, ctx.restaurantId, value)
  revalidatePath('/team')
  return {}
}
