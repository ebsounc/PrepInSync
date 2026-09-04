import { describe, it, expect } from 'vitest'
import {
  MANAGEMENT_ROLES,
  EXECUTION_ROLES,
  ROLE_LABELS,
  INVITABLE_ROLES,
  isManagementRole,
  defaultCanCreateLists,
  isInvitableRole,
  type ProfileRole,
} from '@/lib/auth/roles'

const ALL_ROLES = [...MANAGEMENT_ROLES, ...EXECUTION_ROLES] as ProfileRole[]

describe('role tiers', () => {
  it('classifies all five management roles as management', () => {
    for (const role of MANAGEMENT_ROLES) {
      expect(isManagementRole(role), `${role} should be management`).toBe(true)
    }
  })

  it('classifies all three execution roles as non-management', () => {
    for (const role of EXECUTION_ROLES) {
      expect(isManagementRole(role), `${role} should not be management`).toBe(false)
    }
  })

  it('covers exactly eight roles across the two tiers', () => {
    expect(ALL_ROLES).toHaveLength(8)
    expect(new Set(ALL_ROLES).size).toBe(8)
  })

  it('treats an unknown role as non-management', () => {
    // Roles arrive as strings from the DB; an unrecognized one must not gain access.
    expect(isManagementRole('chef_de_partie')).toBe(false)
    expect(isManagementRole('')).toBe(false)
    expect(isManagementRole('OWNER')).toBe(false)
  })
})

describe('defaultCanCreateLists', () => {
  it('defaults to true for management and false for execution', () => {
    for (const role of MANAGEMENT_ROLES) expect(defaultCanCreateLists(role)).toBe(true)
    for (const role of EXECUTION_ROLES) expect(defaultCanCreateLists(role)).toBe(false)
  })

  it('denies list creation to an unknown role', () => {
    expect(defaultCanCreateLists('chef_de_partie')).toBe(false)
  })
})

describe('invitable roles', () => {
  it('never allows owner to be assigned via invite', () => {
    // Owner is singular per restaurant and protected; it can only change hands
    // through the explicit transfer flow.
    expect(isInvitableRole('owner')).toBe(false)
    expect([...INVITABLE_ROLES]).not.toContain('owner')
  })

  it('allows every other role', () => {
    const expected = ALL_ROLES.filter((r) => r !== 'owner')
    expect([...INVITABLE_ROLES].sort()).toEqual(expected.sort())
    for (const role of expected) expect(isInvitableRole(role)).toBe(true)
  })

  it('rejects an unknown role', () => {
    expect(isInvitableRole('chef_de_partie')).toBe(false)
    expect(isInvitableRole('')).toBe(false)
  })
})

describe('ROLE_LABELS', () => {
  it('has a non-empty label for every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role], `no label for ${role}`).toBeTruthy()
    }
    expect(Object.keys(ROLE_LABELS)).toHaveLength(8)
  })
})
