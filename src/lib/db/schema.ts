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
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// restaurants
// One row per restaurant account. Top-level tenant boundary.
// ---------------------------------------------------------------------------
export const restaurants = pgTable('restaurants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// profiles
// Extends auth.users (managed by Supabase). The FK to auth.users and the
// trigger that auto-inserts this row on signup live in
// supabase/rls_and_triggers.sql — Drizzle does NOT reference auth.users.
// ---------------------------------------------------------------------------
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // same value as auth.users.id
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role', { enum: ['owner', 'general_manager', 'kitchen_manager', 'head_chef', 'sous_chef', 'prep_chef', 'line_cook', 'expeditor'] }).notNull(),
  canCreateLists: boolean('can_create_lists').notNull().default(false),
  preferredLanguage: text('preferred_language', { enum: ['en', 'es'] })
    .notNull()
    .default('en'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// prep_items
// The item catalog for a restaurant — what can be prepped.
// ---------------------------------------------------------------------------
export const prepItems = pgTable('prep_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  parQuantity: numeric('par_quantity'),
  parUnit: text('par_unit'),
  sourceLanguage: text('source_language', { enum: ['en', 'es'] })
    .notNull()
    .default('en'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// prep_lists
// A shift/day prep list authored by a chef.
// ---------------------------------------------------------------------------
export const prepLists = pgTable('prep_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  title: text('title').notNull(),
  date: date('date').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// prep_list_entries
// A single item on a prep list with quantity, assignment, and completion state.
// ---------------------------------------------------------------------------
export const prepListEntries = pgTable('prep_list_entries', {
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
  notes: text('notes'),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// recipes
// Optional recipe attached to a prep_item.
// ingredients is a JSON array: [{ name: string, quantity: string, unit: string }]
// ---------------------------------------------------------------------------
export const recipes = pgTable('recipes', {
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
  sourceLanguage: text('source_language', { enum: ['en', 'es'] })
    .notNull()
    .default('en'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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
    entityType: text('entity_type').notNull(), // e.g. 'prep_item', 'recipe', 'prep_list_entry'
    entityId: uuid('entity_id').notNull(),
    field: text('field').notNull(), // e.g. 'name', 'instructions', 'notes'
    targetLanguage: text('target_language', { enum: ['en', 'es'] }).notNull(),
    translatedText: text('translated_text').notNull(),
    sourceHash: text('source_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.entityType, t.entityId, t.field, t.targetLanguage)]
)

// ---------------------------------------------------------------------------
// glossary_overrides
// User-confirmed translation corrections. Injected into LLM prompts to enforce
// kitchen-specific terminology (e.g. "walk-in" → "cuarto frío" always).
// ---------------------------------------------------------------------------
export const glossaryOverrides = pgTable('glossary_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  sourceTerm: text('source_term').notNull(),
  sourceLanguage: text('source_language', { enum: ['en', 'es'] }).notNull(),
  targetLanguage: text('target_language', { enum: ['en', 'es'] }).notNull(),
  preferredTranslation: text('preferred_translation').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
