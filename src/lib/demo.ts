// The seeded public Demo Kitchen. Team management for this restaurant is frozen so
// the shared public login can't spam invites (which send real emails) or deface the
// roster. The seed script (scripts/seed-demo.mjs) inserts the restaurant with this
// exact id — keep the two in sync.
export const DEMO_RESTAURANT_ID = 'de701000-0000-4000-8000-000000000001'

export function isDemoRestaurant(restaurantId: string | null | undefined): boolean {
  return restaurantId === DEMO_RESTAURANT_ID
}
