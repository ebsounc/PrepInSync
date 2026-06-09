import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  date,
  unique,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql, type AnyColumn } from 'drizzle-orm'

// Shared enum value sets. Reused by BOTH the Drizzle `enum` option (which narrows
// the TypeScript type) and the DB CHECK constraints below, so the application-level
// and database-level domains can never drift apart. Adding a v2 language is a
// one-line change here that flows to both.
const ROLES = [
  'owner',
  'general_manager',
  'kitchen_manager',
  'head_chef',
  'sous_chef',
  'prep_chef',
  'line_cook',
  'expeditor',
] as const

const LANGUAGES = ['en', 'es'] as const

// When a restaurant typically builds its prep lists — drives the new-list date/title default.
const LIST_DAYS = ['today', 'next_day'] as const

// Builds `"<col>" in ('a', 'b', ...)` for a CHECK constraint. We can't use
// drizzle's inLiterals() here: it emits bound parameters ($1, $2) which are invalid
// inside a generated DDL migration. Values are hardcoded constants with no quotes,
// so inlining them as SQL literals via sql.raw is safe.
const inLiterals = (column: AnyColumn, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(', '))})`

// ---------------------------------------------------------------------------
// restaurants
// One row per restaurant account. Top-level tenant boundary.
// ---------------------------------------------------------------------------
export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull(),
    listDefaultDay: text('list_default_day', { enum: LIST_DAYS }).notNull().default('today'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [check('restaurants_list_default_day_check', inLiterals(t.listDefaultDay, LIST_DAYS))]
)

// ---------------------------------------------------------------------------
// profiles
// Extends auth.users (managed by Supabase). The FK to auth.users and the
// trigger that auto-inserts this row on signup live in
// supabase/rls_and_triggers.sql — Drizzle does NOT reference auth.users.
// ---------------------------------------------------------------------------
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(), // same value as auth.users.id
    restaurantId: uuid('restaurant_id').references(() => restaurants.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    role: text('role', { enum: ROLES }).notNull(),
    canCreateLists: boolean('can_create_lists').notNull().default(false),
    preferredLanguage: text('preferred_language', { enum: LANGUAGES })
      .notNull()
      .default('en'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    check('profiles_role_check', inLiterals(t.role, ROLES)),
    check(
      'profiles_preferred_language_check',
      inLiterals(t.preferredLanguage, LANGUAGES)
    ),
    // Enforce exactly-one-owner-per-restaurant at the DB level (a concurrent
    // double-transfer can't create two owners). Partial: only `owner` rows are unique.
    uniqueIndex('one_owner_per_restaurant')
      .on(t.restaurantId)
      .where(sql`${t.role} = 'owner'`),
  ]
)

// ---------------------------------------------------------------------------
// invites
// Pending team invitations. Source of truth for an invited user's restaurant,
// role, and list permission — these are read here on invite acceptance, NOT
// from user_metadata (which the user can edit via supabase.auth.updateUser).
// acceptedAt IS NULL means the invite is still pending.
// ---------------------------------------------------------------------------
export const invites = pgTable(
  'invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    role: text('role', { enum: ROLES }).notNull(),
    canCreateLists: boolean('can_create_lists').notNull().default(false),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [check('invites_role_check', inLiterals(t.role, ROLES))]
)

// ---------------------------------------------------------------------------
// prep_items
// The item catalog for a restaurant — what can be prepped.
// ---------------------------------------------------------------------------
export const prepItems = pgTable(
  'prep_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    name: text('name').notNull(),
    description: text('description'), // optional: storage location, special instructions
    imageUrl: text('image_url'),
    // default_* is the item's optional batch amount. Selecting the item on a prep list
    // prefills the entry's quantity/unit from these (editable).
    defaultQuantity: numeric('default_quantity'),
    defaultUnit: text('default_unit'),
    // par_* is the item's optional par level (target stock to keep on hand) — informational.
    parQuantity: numeric('par_quantity'),
    parUnit: text('par_unit'),
    sourceLanguage: text('source_language', { enum: LANGUAGES })
      .notNull()
      .default('en'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check(
      'prep_items_source_language_check',
      inLiterals(t.sourceLanguage, LANGUAGES)
    ),
  ]
)

// ---------------------------------------------------------------------------
// restaurant_units
// Custom units a restaurant adds beyond the built-in set (e.g. "lexan", "6-pan").
// Units are stored as free text on prep_items.default_unit / par_unit and
// prep_list_entries.unit; this table only widens the selectable list and the
// write-time validation allow-list.
// ---------------------------------------------------------------------------
export const restaurantUnits = pgTable(
  'restaurant_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    label: text('label').notNull(),
    sourceLanguage: text('source_language', { enum: LANGUAGES }).notNull().default('en'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.restaurantId, t.label),
    check('restaurant_units_source_language_check', inLiterals(t.sourceLanguage, LANGUAGES)),
  ]
)

// ---------------------------------------------------------------------------
// prep_lists
// A shift/day prep list authored by a chef.
// ---------------------------------------------------------------------------
export const prepLists = pgTable(
  'prep_lists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    title: text('title').notNull(),
    date: date('date').notNull(),
    // Language the title was authored in (set to the writer's language on create/edit).
    sourceLanguage: text('source_language', { enum: LANGUAGES }).notNull().default('en'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [check('prep_lists_source_language_check', inLiterals(t.sourceLanguage, LANGUAGES))]
)

// ---------------------------------------------------------------------------
// prep_list_entries
// A single item on a prep list with quantity, assignment, and completion state.
// ---------------------------------------------------------------------------
export const prepListEntries = pgTable(
  'prep_list_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prepListId: uuid('prep_list_id')
      .notNull()
      .references(() => prepLists.id, { onDelete: 'cascade' }),
    prepItemId: uuid('prep_item_id')
      .notNull()
      .references(() => prepItems.id),
    quantity: numeric('quantity').notNull(),
    unit: text('unit').notNull(),
    isStarred: boolean('is_starred').notNull().default(false),
    notes: text('notes'), // builder/prep note (instructions, set when building the list)
    // Language `notes` / `cook_note` were authored in. Tracked separately because the
    // builder note and the cook note can be written by different people in different
    // languages. Set to the writer's language whenever the text is written/edited.
    notesSourceLanguage: text('notes_source_language', { enum: LANGUAGES }).notNull().default('en'),
    cookNote: text('cook_note'), // cook's note from the floor ("only half a case left")
    cookNoteSourceLanguage: text('cook_note_source_language', { enum: LANGUAGES })
      .notNull()
      .default('en'),
    cookNoteBy: uuid('cook_note_by').references(() => profiles.id), // who wrote the cook note
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at'),
    completedBy: uuid('completed_by').references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    check('ple_notes_source_language_check', inLiterals(t.notesSourceLanguage, LANGUAGES)),
    check('ple_cook_note_source_language_check', inLiterals(t.cookNoteSourceLanguage, LANGUAGES)),
  ]
)

// ---------------------------------------------------------------------------
// recipes
// Optional recipe attached to a prep_item.
// ingredients is a JSON array: [{ name: string, quantity: string, unit: string }]
// ---------------------------------------------------------------------------
export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    prepItemId: uuid('prep_item_id')
      .notNull()
      .references(() => prepItems.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    imageUrl: text('image_url'),
    ingredients: jsonb('ingredients').notNull().$type<
      { name: string; quantity: string; unit: string }[]
    >(),
    instructions: jsonb('instructions').notNull().$type<
      { text?: string; imageUrl?: string }[]
    >(),
    sourceLanguage: text('source_language', { enum: LANGUAGES })
      .notNull()
      .default('en'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check(
      'recipes_source_language_check',
      inLiterals(t.sourceLanguage, LANGUAGES)
    ),
  ]
)

// ---------------------------------------------------------------------------
// translations
// Lazy translation cache keyed by (entity_type, entity_id, field, target_language).
//
// source_hash is an MD5 of the source text at translation time. On read:
//   1. Compute md5(current source text)
//   2. If it matches source_hash → return cached translated_text
//   3. If it doesn't → delete this row, re-translate, store with new hash
//
// This makes staleness detection automatic regardless of update-path discipline.
// ---------------------------------------------------------------------------
export const translations = pgTable(
  'translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Denormalized restaurant owner of the source entity. Drives RLS isolation
    // (the table is keyed by entity_id, which alone can't be traced to a tenant)
    // and is set at write time by the cache layer, which always knows it.
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    entityType: text('entity_type').notNull(), // e.g. 'prep_item', 'recipe', 'prep_list_entry'
    entityId: uuid('entity_id').notNull(),
    field: text('field').notNull(), // e.g. 'name', 'instructions', 'notes'
    targetLanguage: text('target_language', { enum: LANGUAGES }).notNull(),
    translatedText: text('translated_text').notNull(),
    sourceHash: text('source_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    // restaurant_id is part of the key so a row can never be re-homed to another
    // tenant on upsert conflict (entity_id is per-restaurant, but keying on it
    // alone would let a colliding write overwrite restaurant_id).
    unique().on(
      t.restaurantId,
      t.entityType,
      t.entityId,
      t.field,
      t.targetLanguage
    ),
    check(
      'translations_target_language_check',
      inLiterals(t.targetLanguage, LANGUAGES)
    ),
  ]
)

// ---------------------------------------------------------------------------
// glossary_overrides
// User-confirmed translation corrections. Injected into LLM prompts to enforce
// kitchen-specific terminology (e.g. "walk-in" → "cuarto frío" always).
// ---------------------------------------------------------------------------
export const glossaryOverrides = pgTable(
  'glossary_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    sourceTerm: text('source_term').notNull(),
    sourceLanguage: text('source_language', { enum: LANGUAGES }).notNull(),
    targetLanguage: text('target_language', { enum: LANGUAGES }).notNull(),
    preferredTranslation: text('preferred_translation').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check(
      'glossary_overrides_source_language_check',
      inLiterals(t.sourceLanguage, LANGUAGES)
    ),
    check(
      'glossary_overrides_target_language_check',
      inLiterals(t.targetLanguage, LANGUAGES)
    ),
    // One override per term+direction per restaurant — a re-correction upserts
    // rather than piling up duplicate rows.
    unique().on(
      t.restaurantId,
      t.sourceTerm,
      t.sourceLanguage,
      t.targetLanguage
    ),
  ]
)
