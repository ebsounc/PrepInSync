import { test, expect } from '@playwright/test'
import {
  loadE2eEnv,
  SKIP_MESSAGE,
  E2E_EMAIL,
  E2E_PASSWORD,
  E2E_FIRST_NAME,
  E2E_RESTAURANT,
} from './env'

// One end-to-end pass over the deterministic core of the app: sign in, create the
// restaurant, add a prep item, build a list from it, work the list, and flip the whole
// interface to Spanish.
//
// It deliberately asserts only on static i18n dictionary strings and never on LLM
// output -- content translation is nondeterministic and would flake on model drift.
//
// Form fields are located by their `name` attribute because that is the actual server
// action contract; buttons and links by accessible role, which is what a cook touches.

test.describe.configure({ mode: 'serial' })

const ITEM_NAME = 'Yellow onion'
const LIST_TITLE = 'E2E morning prep'

test.beforeAll(() => {
  const env = loadE2eEnv()
  test.skip(!env.ok, `Missing ${env.missing.join(', ')}. ${SKIP_MESSAGE}`)
})

test('a new owner onboards, builds a prep list, works it, and switches to Spanish', async ({
  page,
}) => {
  await test.step('sign in', async () => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(E2E_EMAIL)
    await page.locator('input[name="password"]').fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
  })

  await test.step('create the restaurant', async () => {
    // A fresh signup has restaurant_id NULL, so the app routes to onboarding.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 })
    await page.locator('input[name="restaurantName"]').fill(E2E_RESTAURANT)
    // The timezone select self-populates from Intl in an effect, which is what
    // un-disables the submit button -- Playwright waits for that.
    await page.getByRole('button', { name: 'Create my restaurant' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })

  await test.step('land on the dashboard as the owner', async () => {
    // Greeting is computed in the restaurant's timezone; the name comes from the
    // profile the signup trigger built out of auth metadata.
    await expect(
      page.getByRole('heading', { name: new RegExp(`Good (morning|afternoon|evening), ${E2E_FIRST_NAME}`) })
    ).toBeVisible()
    // Team is management-only, so its presence confirms onboarding granted ownership.
    await expect(page.getByRole('link', { name: 'Team' })).toBeVisible()
  })

  await test.step('add a prep item with a default amount', async () => {
    await page.getByRole('link', { name: 'Items' }).click()
    await expect(page).toHaveURL(/\/items/)

    // On an empty catalog the add form renders already expanded; once there are items
    // it collapses behind a button. Handle both so the test doesn't depend on which.
    const nameInput = page.locator('input[name="name"]')
    if (!(await nameInput.isVisible())) {
      await page.getByRole('button', { name: 'Add an item' }).click()
    }
    await nameInput.fill(ITEM_NAME)
    await page.locator('input[name="defaultQuantity"]').fill('2')

    // Unit is a custom Base UI select backed by a hidden input.
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'lb', exact: true }).click()
    await expect(page.locator('input[name="defaultUnit"]')).toHaveValue('lb')

    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    await expect(page.getByText(ITEM_NAME)).toBeVisible()
  })

  await test.step('build a prep list', async () => {
    await page.getByRole('link', { name: 'Lists' }).click()
    // Rendered as a Base UI Button wrapping a Link with nativeButton={false},
    // so its role is button even though it navigates.
    await page.getByRole('button', { name: 'New list' }).click()

    await page.locator('input[name="title"]').fill(LIST_TITLE)
    // The date input is prefilled in the restaurant's timezone; leave it as-is.
    await expect(page.locator('input[name="date"]')).not.toHaveValue('')
    await page.getByRole('button', { name: 'Create list' }).click()

    await expect(page.getByText(LIST_TITLE)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('add the item to the list', async () => {
    // Same collapsed/expanded question as the item form above.
    const search = page.getByPlaceholder(/Search items/i)
    if (!(await search.isVisible())) {
      await page.getByRole('button', { name: 'Add an item' }).click()
    }

    // Searchable combobox; picking an item prefills quantity and unit from its default.
    await search.click()
    await search.fill('Yellow')
    await page.getByRole('option', { name: ITEM_NAME }).click()

    await expect(page.locator('input[name="quantity"]')).toHaveValue('2')
    await expect(page.locator('input[name="unit"]')).toHaveValue('lb')

    await page.getByRole('button', { name: 'Add to list' }).click()
    await expect(page.getByText('0/1 done')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('check the item off', async () => {
    // The whole left region of the row is one big button (a greasy-hands target), so
    // its accessible name is the item text and its state lives on aria-pressed.
    const toggle = page.getByRole('button', { name: new RegExp(ITEM_NAME) })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()

    // Flips optimistically, then persists.
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('1/1 done')).toBeVisible({ timeout: 30_000 })
    // Completion is attributed to whoever checked it.
    await expect(page.getByText(/Done by/)).toBeVisible()
  })

  await test.step('switch the whole interface to Spanish', async () => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByRole('button', { name: 'Español' }).click()
    await page.getByRole('button', { name: 'Save language' }).click()

    // App chrome comes from the static dictionary, so these are exact and stable.
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Listas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Artículos' })).toBeVisible()
  })

  await test.step('switch back to English', async () => {
    await page.getByRole('button', { name: 'English' }).click()
    await page.getByRole('button', { name: 'Guardar idioma' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 30_000,
    })
  })
})
