# Phase 2 walkthrough — round 3

Third self-guided run — turning your round-2 notes into changes. Go screen by screen,
do the actions, write what you like / don't like / want changed. No wrong answers — this
is about how it *feels*, especially on a phone.

> **Tip:** do at least one full pass on your actual phone. This app lives in an apron
> pocket — desktop will feel fine even when the phone doesn't.

Each section calls out **↻ Changed since round 2** so you can check the fixes landed and
feel right. Fill in the notes block at the end of each. This is meant to be the (hopefully)
final Phase-2 pass before we move on to the translation layer.

---

## Round-3 observations (spot check — no full walkthrough)

Elijah eyeballed round 3 instead of a full run. Notes + how each was handled (a small
follow-up batch, no round 4):

- **New preset date is good.** 👍
- **AM/PM title hint:** if the list is for *today* and it's already afternoon, the hint
  shouldn't say "a.m. prep." → **Done:** the hint now picks "p.m." when today + afternoon.
- **Lists for an arbitrary number of days out:** → **Already supported** — the New-list date
  field is a full calendar; the today/next-day setting only sets the *default*. No change.
- **Phone error (hydration mismatch):** → **Root-caused: a browser extension, not our code.**
  The dev overlay's diff showed the mismatching attributes are **`__gcrremoteframetoken`** on
  `<html>` and **`__gcruniqueid`** on `<form>` — `__gcr*` is injected by a browser extension on
  the phone, not by React/Next/our app. Conclusions: (1) it's **dev-only** — the red screen is
  the Next.js dev error overlay; the deployed production build has no overlay, so real users
  (even with extensions) never see an error. (2) **No clean code fix** — the extension injects
  on multiple/arbitrary elements; scattering `suppressHydrationWarning` everywhere would just
  fight the extension and pollute the code, so a speculative attempt was reverted. **Real fix:**
  disable that extension on the phone (or use a clean browser profile). Not a Phase-2 blocker.
- **Items list — Default & Par on one line:** → **Done:** now on two separate lines.
- **Transfer ownership:** → **Done:** added to Settings (owner-only) with a confirm/warning;
  the old owner becomes General Manager.

---

## Setup (5 min)

1. Start the app: `npm run dev`, open the printed URL (http://localhost:3000, or 3001 if
   3000 is busy).
2. You need a **builder** and a **cook** in the same restaurant. Accounts available in your
   **"test kitchen"**:
   - **Elijah** (owner — builder), your own password.
   - **Tony Baloney** (head chef — builder): `tony@kitchenapp.test` / `QaTest1234!`
   - **Sam Rivera** (prep chef — cook): `sam@kitchenapp.test` / `QaTest1234!`
   - (Or the separate QA pair: `qa.builder@example.com` / `qa.cook@example.com` / `QaTest1234!`.)
3. Use a second browser or a private/incognito window so you can be the builder in one and
   the cook in the other, side by side.

---

## 1. Home / Dashboard

**As:** builder
**↻ Changed since round 2:**
- The phone **hydration error** (the "tree is hydrated… didn't match" message) should be **gone**.
- Today's prep lists now show a **read-only preview checklist** — the items, with what's
  checked off so far — right on the card.
**Look for:**
- [ ] (If you can) open the browser console on the Chef account on your phone — no red
      hydration error
- [ ] Greeting + date still read right
- [ ] The today's-list preview shows items, with done ones checked/struck through
- [ ] The preview feels useful, not cluttered

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 2. Items — default amount + par level

**As:** builder
**Do:**
- Add an item with a **Default amount** (e.g. 2 lb).
- Tap **"+ Add par level"** and set a par (e.g. 6 lb). Save.
- Add a custom unit (via "+ Add a unit…") while filling the form.
- Edit an item.
**↻ Changed since round 2:**
- "Default amount" and **par level are now separate** — par is tucked behind a
  **"+ Add par level"** button so it doesn't clutter the form.
- The saved row shows both: "Default: 2 lbs · Par: 6 lbs".
- The **console error when adding a custom unit is fixed** (was the "uncontrolled
  FieldControl" warning).
**Look for:**
- [ ] The default vs. par split is clear; "+ Add par level" feels right (not buried)
- [ ] Both show on the saved item
- [ ] Adding a custom unit no longer throws a console error
- [ ] Editing an item pre-fills both default and par

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 3. Creating a prep list (date default)

**As:** builder
**↻ Changed since round 2:**
- The new-list **date now follows your restaurant setting** (today vs. the next day — set it
  in Settings, section 7). The title hint matches that day's weekday ("e.g. Friday a.m. prep").
**Look for:**
- [ ] Date defaults to the day you'd expect (after setting your preference in §7)
- [ ] Title hint reads naturally
- [ ] Calendar picker is fine on a phone

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 4. Building the list

**As:** builder
**Do:**
- Add an item (qty/unit prefill from its default). Add an **instruction** for the cook.
- Add the **same item again** — watch for the confirm.
- After the list has items, notice the add form is **collapsed to a button**.
- Edit the list's **name/date** via the pencil by the title.
**↻ Changed since round 2:**
- The note field is now **"Instructions for cook"** (clearer than "Prep note").
- Adding the **same item twice** now asks to confirm first.
- The add form **collapses to an "Add an item" button** once the list has entries.
- A **pencil by the list title** lets you rename / re-date the list.
**Look for:**
- [ ] "Instructions for cook" reads clearly
- [ ] The duplicate confirm ("…already on the list. Add it again?") feels right — not annoying
- [ ] Collapsing the add form keeps the screen clean
- [ ] Editing the list name/date works and feels safe

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 5. Working the list as a cook + note attribution

**As:** cook (second browser/incognito), then switch back to builder
**Do:**
- As the cook, add **your own note** on an item.
- Switch to the builder and look at that note.
**↻ Changed since round 2:**
- Cook notes are now **attributed**: you see **"Your note"** on the ones you wrote;
  everyone else sees **"<Your name>'s note"**. Still separate from the builder's instructions.
**Look for:**
- [ ] As the cook, your note shows as "Your note"
- [ ] As the builder, the cook's note shows as "Sam's note" (their name)
- [ ] The builder's instructions and the cook's note never collide
- [ ] Completing items + the "All done" banner still feel good

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 6. Team — change role

**As:** builder/management
**Do:**
- On a member, use the **role dropdown** to change their role.
- Watch the **Lists** badge after changing between a management and an execution role.
**↻ Changed since round 2:**
- You can now **change a member's role** inline.
- Changing role **resets their list-creation permission to that role's default** (managers
  get it, execution roles don't) — so a demotion doesn't silently leave building access behind.
- The **invite card is now centered**.
**Look for:**
- [ ] Changing a role is obvious and quick
- [ ] The Lists permission updates sensibly when the tier changes
- [ ] Invite card looks centered
- [ ] You still can't change the owner or your own role

```
👍 Likes:
👎 Dislikes:
💡 Ideas (this is where you wanted personal settings / profile pics later — note anything):
```

---

## 7. Settings

**As:** builder/management (gear icon)
**Do:**
- Set **"We usually build lists for"** to today or the next day, save. Then create a new
  list (section 3) and confirm the date matches.
- Look at the **timezone** field.
**↻ Changed since round 2:**
- New **"We usually build lists for"** preference (today / next day).
- The **timezone now shows a friendly label** ("Eastern Time — New York") instead of the
  raw "America/New_York" with an underscore.
**Look for:**
- [ ] The list-day preference is worded clearly and actually changes the new-list default
- [ ] Timezone reads cleanly (no underscores)
- [ ] Saving still confirms

```
👍 Likes:
👎 Dislikes:
💡 Ideas (icon upload, transfer ownership — still on the someday list; note anything new):
```

---

## 8. Overall feel

**Look for:**
- [ ] Moving between tabs is quick and never confusing
- [ ] Nothing is too small to tap with one thumb / greasy hands
- [ ] Wording sounds like a kitchen, not software

```
Biggest things I'd still change:
1.
2.
3.

Did the round-2 fixes land the way you wanted? (default/par split, duplicate confirm,
"Instructions for cook", note attribution, role change, list-day default, timezone label,
the phone hydration error):

Am I ready to call Phase 2 done and move to the translation layer? (yes / not yet — what's left):
```

---

### When you're done

Hand this back with your notes. If Phase 2 feels done, the next phase is the **translation
layer** (English ↔ Spanish, lazy + cached, glossary-backed). Still deliberately out of scope
here: recipes, photos, live auto-refresh, offline, and the broad visual/UI redesign.
