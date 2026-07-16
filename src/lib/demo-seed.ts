import 'server-only'
import { eq } from 'drizzle-orm'
import {
  db,
  restaurants,
  profiles,
  prepItems,
  recipes,
  prepLists,
  prepListEntries,
  restaurantUnits,
  translations,
  glossaryOverrides,
} from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadImage } from '@/lib/storage'
import { defaultCanCreateLists, type ProfileRole } from '@/lib/auth/roles'
import { DEMO_RESTAURANT_ID } from '@/lib/demo'
import { DEMO_IMAGES } from '@/lib/demo-images'

// Cover tiles live at a stable per-restaurant path (keyed by slug, NOT item id) so
// they survive the per-reset item churn without re-uploading.
const demoImagePath = (slug: string) => `${DEMO_RESTAURANT_ID}/demo/${slug}.jpg`

// ============================================================================
// The public "Demo Kitchen" — a steakhouse with a full staff roster and a
// realistic amount of prep. One login (the General Manager, DEMO_LOGIN) is
// shared publicly; the rest are ghost accounts that populate the roster and get
// attributed on completions/notes. resetDemoData() wipes + reseeds the prep data
// (called on every demo login, so each visitor gets a clean kitchen).
// ============================================================================

export const DEMO_LOGIN = { email: 'demo@prepinsync.app', password: 'DemoKitchen1!' }

type Member = {
  key: string
  email: string
  firstName: string
  lastName: string
  role: ProfileRole
  lang: 'en' | 'es'
}

// The GM (key 'gm') is the public login. Everyone else is a ghost (random password,
// never shared). José and Sofía read Spanish — their cook notes are authored in
// Spanish, so an English viewer sees them translate (and vice versa).
const ROSTER: Member[] = [
  { key: 'owner', email: 'owner@demo.prepinsync.app', firstName: 'Robert', lastName: 'Keller', role: 'owner', lang: 'en' },
  { key: 'gm', email: DEMO_LOGIN.email, firstName: 'Demo', lastName: 'Account', role: 'general_manager', lang: 'en' },
  { key: 'kmgr', email: 'kmgr@demo.prepinsync.app', firstName: 'Priya', lastName: 'Nair', role: 'kitchen_manager', lang: 'en' },
  { key: 'headchef', email: 'headchef@demo.prepinsync.app', firstName: 'Marco', lastName: 'Rossi', role: 'head_chef', lang: 'en' },
  { key: 'souschef', email: 'souschef@demo.prepinsync.app', firstName: 'Danielle', lastName: 'Brooks', role: 'sous_chef', lang: 'en' },
  { key: 'prep1', email: 'prep1@demo.prepinsync.app', firstName: 'José', lastName: 'Ramírez', role: 'prep_chef', lang: 'es' },
  { key: 'prep2', email: 'prep2@demo.prepinsync.app', firstName: 'Emily', lastName: 'Chen', role: 'prep_chef', lang: 'en' },
  { key: 'line1', email: 'line1@demo.prepinsync.app', firstName: 'Tyrone', lastName: 'Jackson', role: 'line_cook', lang: 'en' },
  { key: 'line2', email: 'line2@demo.prepinsync.app', firstName: 'Sofía', lastName: 'Delgado', role: 'line_cook', lang: 'es' },
  { key: 'expo', email: 'expo@demo.prepinsync.app', firstName: 'Liam', lastName: "O'Brien", role: 'expeditor', lang: 'en' },
]
const memberName = (key: string) => {
  const m = ROSTER.find((r) => r.key === key)!
  return `${m.firstName} ${m.lastName}`
}

type Recipe = { ingredients: { name: string; quantity: string; unit: string }[]; instructions: { text: string }[] }
type Item = {
  name: string
  description?: string
  dq?: string
  du?: string
  pq?: string
  pu?: string
  recipe?: Recipe
  photo?: string // slug into DEMO_IMAGES
}

const ITEMS: Item[] = [
  { name: 'Ribeye (12 oz)', description: 'Trim and portion to 12 oz; store on lined sheet trays.', dq: '20', du: 'each', pq: '40', pu: 'each', photo: 'ribeye' },
  { name: 'NY strip (10 oz)', description: 'Portion to 10 oz, trim silverskin.', dq: '18', du: 'each', pq: '30', pu: 'each', photo: 'nystrip' },
  { name: 'Filet mignon (8 oz)', description: 'Trim, bard with bacon, tie.', dq: '15', du: 'each', pq: '24', pu: 'each', photo: 'filet' },
  { name: 'Ground chuck blend', description: '80/20 for burgers, portioned to 8 oz.', dq: '15', du: 'lb' },
  {
    name: 'House steak rub', dq: '2', du: 'qt', pq: '4', pu: 'qt',
    recipe: {
      ingredients: [
        { name: 'Kosher salt', quantity: '1', unit: 'cup' },
        { name: 'Coarse black pepper', quantity: '0.5', unit: 'cup' },
        { name: 'Granulated garlic', quantity: '0.25', unit: 'cup' },
        { name: 'Smoked paprika', quantity: '2', unit: 'tbsp' },
        { name: 'Brown sugar', quantity: '2', unit: 'tbsp' },
      ],
      instructions: [{ text: 'Combine all in a dry container.' }, { text: 'Whisk to blend evenly.' }, { text: 'Store airtight; label and date.' }],
    },
  },
  {
    name: 'Compound herb butter', dq: '3', du: 'lb',
    recipe: {
      ingredients: [
        { name: 'Butter, softened', quantity: '2', unit: 'lb' },
        { name: 'Parsley, chopped', quantity: '0.5', unit: 'cup' },
        { name: 'Garlic, minced', quantity: '3', unit: 'tbsp' },
        { name: 'Lemon zest', quantity: '1', unit: '' },
        { name: 'Salt', quantity: '', unit: '' },
      ],
      instructions: [{ text: 'Whip butter until light.' }, { text: 'Fold in herbs, garlic, and zest; season.' }, { text: 'Roll in parchment into logs and chill.' }],
    },
  },
  {
    name: 'Béarnaise sauce', dq: '2', du: 'qt',
    recipe: {
      ingredients: [
        { name: 'Egg yolks', quantity: '6', unit: 'each' },
        { name: 'Clarified butter', quantity: '2', unit: 'cup' },
        { name: 'White wine vinegar', quantity: '0.25', unit: 'cup' },
        { name: 'Shallot, minced', quantity: '2', unit: 'tbsp' },
        { name: 'Tarragon', quantity: '2', unit: 'tbsp' },
      ],
      instructions: [
        { text: 'Reduce vinegar with shallot and tarragon; cool slightly.' },
        { text: 'Whisk yolks with the reduction over a bain-marie.' },
        { text: 'Slowly stream in warm butter until thick.' },
        { text: 'Season and hold warm.' },
      ],
    },
  },
  {
    name: 'Peppercorn sauce', dq: '2', du: 'qt', photo: 'peppercorn',
    recipe: {
      ingredients: [
        { name: 'Demi-glace', quantity: '2', unit: 'cup' },
        { name: 'Heavy cream', quantity: '1', unit: 'cup' },
        { name: 'Green peppercorns', quantity: '3', unit: 'tbsp' },
        { name: 'Brandy', quantity: '0.25', unit: 'cup' },
        { name: 'Butter', quantity: '2', unit: 'tbsp' },
      ],
      instructions: [{ text: 'Bloom peppercorns in butter.' }, { text: 'Deglaze with brandy.' }, { text: 'Add demi and cream; reduce to nappe.' }, { text: 'Season to taste.' }],
    },
  },
  { name: 'Demi-glace', description: '48-hour veal stock reduction.', dq: '1', du: 'gal', pq: '2', pu: 'gal' },
  { name: 'Red wine reduction', description: 'Cabernet, shallot, thyme.', dq: '1', du: 'qt' },
  {
    name: 'Garlic mashed potatoes', dq: '4', du: 'container', photo: 'mashed',
    recipe: {
      ingredients: [
        { name: 'Yukon gold potatoes', quantity: '10', unit: 'lb' },
        { name: 'Butter', quantity: '1', unit: 'lb' },
        { name: 'Cream', quantity: '2', unit: 'cup' },
        { name: 'Roasted garlic', quantity: '0.5', unit: 'cup' },
        { name: 'Salt', quantity: '', unit: '' },
      ],
      instructions: [{ text: 'Boil potatoes until tender; drain.' }, { text: 'Warm cream, butter, and garlic.' }, { text: 'Rice potatoes; fold in the warm liquid.' }, { text: 'Season and hold hot.' }],
    },
  },
  {
    name: 'Creamed spinach', dq: '3', du: 'container', photo: 'spinach',
    recipe: {
      ingredients: [
        { name: 'Spinach', quantity: '5', unit: 'lb' },
        { name: 'Cream', quantity: '3', unit: 'cup' },
        { name: 'Parmesan', quantity: '1', unit: 'cup' },
        { name: 'Nutmeg', quantity: '', unit: '' },
        { name: 'Butter', quantity: '4', unit: 'tbsp' },
      ],
      instructions: [{ text: 'Blanch and squeeze spinach dry; chop.' }, { text: 'Make a light cream reduction with butter.' }, { text: 'Fold in spinach and parmesan.' }, { text: 'Finish with nutmeg; season.' }],
    },
  },
  { name: 'Mac and cheese', description: 'Three-cheese, panko top.', dq: '2', du: 'tray', photo: 'mac' },
  { name: 'Roasted mushrooms', description: 'Cremini, thyme, garlic.', dq: '2', du: 'container' },
  { name: 'Caramelized onions', dq: '2', du: 'qt' },
  {
    name: 'House vinaigrette', dq: '2', du: 'qt',
    recipe: {
      ingredients: [
        { name: 'Red wine vinegar', quantity: '1', unit: 'cup' },
        { name: 'Dijon', quantity: '2', unit: 'tbsp' },
        { name: 'Olive oil', quantity: '3', unit: 'cup' },
        { name: 'Shallot, minced', quantity: '2', unit: 'tbsp' },
        { name: 'Honey', quantity: '1', unit: 'tbsp' },
      ],
      instructions: [{ text: 'Whisk vinegar, dijon, shallot, and honey.' }, { text: 'Stream in oil to emulsify.' }, { text: 'Season; refrigerate.' }],
    },
  },
  { name: 'Bacon lardons', description: 'For salads and garnish.', dq: '2', du: 'lb' },
]

type Entry = {
  item: string
  qty: string
  unit: string
  star?: boolean
  notes?: string
  done?: boolean
  by?: string // roster key who completed it
  cookNote?: string
  cookNoteLang?: 'en' | 'es'
  cookNoteBy?: string
}
type List = { title: string; offset: number; entries: Entry[] }

const LISTS: List[] = [
  {
    title: 'Dinner prep',
    offset: 0,
    entries: [
      { item: 'Ribeye (12 oz)', qty: '24', unit: 'each', star: true, notes: 'Trim tight, uniform 12 oz.', done: true, by: 'prep2' },
      { item: 'NY strip (10 oz)', qty: '20', unit: 'each', done: true, by: 'prep2' },
      { item: 'Filet mignon (8 oz)', qty: '16', unit: 'each', star: true, notes: 'Bard and tie.' },
      { item: 'House steak rub', qty: '2', unit: 'qt', done: true, by: 'prep1' },
      { item: 'Compound herb butter', qty: '3', unit: 'lb', notes: 'Roll two logs.', done: true, by: 'souschef' },
      { item: 'Béarnaise sauce', qty: '2', unit: 'qt', star: true, cookNote: 'Faltan chalotes — avisar al chef.', cookNoteLang: 'es', cookNoteBy: 'prep1' },
      { item: 'Peppercorn sauce', qty: '2', unit: 'qt' },
      { item: 'Garlic mashed potatoes', qty: '4', unit: 'container', done: true, by: 'line1' },
      { item: 'Creamed spinach', qty: '3', unit: 'container', notes: 'Squeeze the spinach well.' },
      { item: 'Roasted mushrooms', qty: '2', unit: 'container', done: true, by: 'line2', cookNote: 'Usé tomillo fresco, quedó mejor.', cookNoteLang: 'es', cookNoteBy: 'line2' },
      { item: 'Caramelized onions', qty: '2', unit: 'qt', done: true, by: 'line1' },
      { item: 'House vinaigrette', qty: '2', unit: 'qt' },
    ],
  },
  {
    title: 'Tomorrow — Sat dinner',
    offset: 1,
    entries: [
      { item: 'Ribeye (12 oz)', qty: '30', unit: 'each', star: true },
      { item: 'Filet mignon (8 oz)', qty: '20', unit: 'each' },
      { item: 'Demi-glace', qty: '2', unit: 'gal', notes: 'Start early — 48-hour reduction.' },
      { item: 'Garlic mashed potatoes', qty: '5', unit: 'container' },
      { item: 'Creamed spinach', qty: '4', unit: 'container' },
      { item: 'House steak rub', qty: '2', unit: 'qt' },
    ],
  },
]

const TZ = 'America/New_York'
const dayString = (offset: number) => {
  const d = new Date(Date.now() + offset * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

// Idempotent: creates the restaurant + every roster account (or updates them). Auth
// users persist across resets; the GM password is kept in sync. Run once (or to add
// a missing account). resetDemoData() handles the prep content.
// Uploads the cover tiles to their stable paths (upsert, so re-running is harmless).
// Storage isn't touched by resetDemoData, so this only needs to run at setup time.
export async function uploadDemoImages() {
  for (const [slug, b64] of Object.entries(DEMO_IMAGES)) {
    await uploadImage(demoImagePath(slug), Buffer.from(b64, 'base64'), 'image/jpeg')
  }
}

export async function ensureDemoAccounts() {
  const admin = createAdminClient()

  await db
    .insert(restaurants)
    .values({ id: DEMO_RESTAURANT_ID, name: 'Demo Kitchen', timezone: TZ, listDefaultDay: 'today' })
    .onConflictDoUpdate({ target: restaurants.id, set: { name: 'Demo Kitchen', timezone: TZ, listDefaultDay: 'today' } })

  await uploadDemoImages()

  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  for (const m of ROSTER) {
    const password = m.key === 'gm' ? DEMO_LOGIN.password : crypto.randomUUID()
    let id = existing.users.find((u) => u.email === m.email)?.id
    if (!id) {
      const created = await admin.auth.admin.createUser({
        email: m.email,
        password,
        email_confirm: true,
        user_metadata: { first_name: m.firstName, last_name: m.lastName, preferred_language: m.lang },
      })
      id = created.data?.user?.id
      if (!id) throw new Error(`could not create ${m.email}: ${created.error?.message}`)
    } else if (m.key === 'gm') {
      await admin.auth.admin.updateUserById(id, { password }) // keep the documented login working
    }
    await db
      .insert(profiles)
      .values({
        id,
        restaurantId: DEMO_RESTAURANT_ID,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        canCreateLists: defaultCanCreateLists(m.role),
        preferredLanguage: m.lang,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          restaurantId: DEMO_RESTAURANT_ID,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          canCreateLists: defaultCanCreateLists(m.role),
          preferredLanguage: m.lang,
          isActive: true,
        },
      })
  }
}

// Wipes the demo kitchen's prep content and reseeds it fresh. Accounts, roster, and
// the restaurant are left intact. Called on every demo login so each visitor starts
// clean. Requires ensureDemoAccounts() to have run.
export async function resetDemoData() {
  await db.delete(prepLists).where(eq(prepLists.restaurantId, DEMO_RESTAURANT_ID)) // cascades entries
  await db.delete(recipes).where(eq(recipes.restaurantId, DEMO_RESTAURANT_ID))
  await db.delete(prepItems).where(eq(prepItems.restaurantId, DEMO_RESTAURANT_ID))
  await db.delete(restaurantUnits).where(eq(restaurantUnits.restaurantId, DEMO_RESTAURANT_ID))
  await db.delete(translations).where(eq(translations.restaurantId, DEMO_RESTAURANT_ID))
  await db.delete(glossaryOverrides).where(eq(glossaryOverrides.restaurantId, DEMO_RESTAURANT_ID))

  const members = await db
    .select({ id: profiles.id, first: profiles.firstName, last: profiles.lastName })
    .from(profiles)
    .where(eq(profiles.restaurantId, DEMO_RESTAURANT_ID))
  const idByName = new Map(members.map((m) => [`${m.first} ${m.last}`, m.id]))
  const uid = (key: string) => idByName.get(memberName(key))
  const gmId = uid('gm')
  if (!gmId) throw new Error('demo accounts missing — run ensureDemoAccounts() first')

  // Bulk-insert everything (a handful of round-trips) so the on-login reset stays snappy.
  const itemRows = await db
    .insert(prepItems)
    .values(
      ITEMS.map((it) => ({
        restaurantId: DEMO_RESTAURANT_ID,
        name: it.name,
        description: it.description ?? null,
        imageUrl: it.photo ? demoImagePath(it.photo) : null,
        defaultQuantity: it.dq ?? null,
        defaultUnit: it.du ?? null,
        parQuantity: it.pq ?? null,
        parUnit: it.pu ?? null,
        sourceLanguage: 'en' as const,
        createdBy: gmId,
      }))
    )
    .returning({ id: prepItems.id, name: prepItems.name })
  const itemId = Object.fromEntries(itemRows.map((r) => [r.name, r.id]))

  const recipeValues = ITEMS.filter((it) => it.recipe).map((it) => ({
    prepItemId: itemId[it.name],
    restaurantId: DEMO_RESTAURANT_ID,
    ingredients: it.recipe!.ingredients,
    instructions: it.recipe!.instructions,
    sourceLanguage: 'en' as const,
    createdBy: gmId,
  }))
  if (recipeValues.length) await db.insert(recipes).values(recipeValues)

  const listRows = await db
    .insert(prepLists)
    .values(
      LISTS.map((l) => ({
        restaurantId: DEMO_RESTAURANT_ID,
        title: l.title,
        date: dayString(l.offset),
        sourceLanguage: 'en' as const,
        createdBy: gmId,
      }))
    )
    .returning({ id: prepLists.id, title: prepLists.title })
  const listId = Object.fromEntries(listRows.map((r) => [r.title, r.id]))

  const entryValues = LISTS.flatMap((l) =>
    l.entries.map((e) => ({
      prepListId: listId[l.title],
      prepItemId: itemId[e.item],
      quantity: e.qty,
      unit: e.unit,
      isStarred: e.star ?? false,
      notes: e.notes ?? null,
      notesSourceLanguage: 'en' as const,
      cookNote: e.cookNote ?? null,
      cookNoteSourceLanguage: e.cookNoteLang ?? ('en' as const),
      cookNoteBy: e.cookNoteBy ? (uid(e.cookNoteBy) ?? null) : null,
      completed: e.done ?? false,
      completedAt: e.done ? new Date() : null,
      completedBy: e.done && e.by ? (uid(e.by) ?? null) : null,
    }))
  )
  await db.insert(prepListEntries).values(entryValues)
}
