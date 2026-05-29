export const MANAGEMENT_ROLES = [
  'owner',
  'general_manager',
  'kitchen_manager',
  'head_chef',
  'sous_chef',
] as const

export const EXECUTION_ROLES = ['prep_chef', 'line_cook', 'expeditor'] as const

export type ProfileRole =
  | (typeof MANAGEMENT_ROLES)[number]
  | (typeof EXECUTION_ROLES)[number]

export function isManagementRole(role: string): boolean {
  return (MANAGEMENT_ROLES as readonly string[]).includes(role)
}

export function defaultCanCreateLists(role: string): boolean {
  return isManagementRole(role)
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  owner: 'Owner',
  general_manager: 'General Manager',
  kitchen_manager: 'Kitchen Manager',
  head_chef: 'Head Chef',
  sous_chef: 'Sous Chef',
  prep_chef: 'Prep Chef',
  line_cook: 'Line Cook',
  expeditor: 'Expeditor',
}

// Roles available for invite (owner cannot be assigned via invite)
export const INVITABLE_ROLES = [
  'general_manager',
  'kitchen_manager',
  'head_chef',
  'sous_chef',
  'prep_chef',
  'line_cook',
  'expeditor',
] as const satisfies readonly ProfileRole[]

export function isInvitableRole(role: string): role is (typeof INVITABLE_ROLES)[number] {
  return (INVITABLE_ROLES as readonly string[]).includes(role)
}
