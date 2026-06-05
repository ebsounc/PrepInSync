# Phase 2 walkthrough — round 2

A second self-guided run, now that the round-1 dislikes/ideas are built. Go screen by
screen, do the actions, and write down what you like / don't like / want changed.
Same as last time: no wrong answers — this is about how it *feels*, especially on a phone.

> **Tip:** do at least one full pass on your actual phone (open the dev URL on your
> phone's browser, or your desktop browser's narrow/mobile view). This app lives in an
> apron pocket — desktop will feel fine even when the phone doesn't.

Each section calls out **↻ Changed since round 1** so you can check the fixes landed and
feel right, plus the new stuff. Fill in the notes block at the end of each.

---

## Setup (5 min)

1. Start the app: `npm run dev`, open the printed URL (http://localhost:3000, or 3001 if
   3000 is busy).
2. You need **two accounts in the same restaurant** to feel the whole loop:
   - a **builder** (chef/manager who creates lists), and
   - a **cook** (execution user who works the list).
3. Your **"test kitchen"** restaurant was wiped clean (no items/lists) for a fresh run —
   you (Elijah, owner) are the builder. For the cook side, pick one:
   - log in as **Sam** (prep_chef, same restaurant) if you have those credentials, or
   - use the seeded QA pair in a separate "QA Test Kitchen": `qa.builder@example.com` /
     `qa.cook@example.com`, password `QaTest1234!`, or
   - ask me to seed a cook in your test kitchen.
4. Switch between accounts using a second browser or a private/incognito window so you can
   be the builder in one and the cook in the other, side by side.

How to read each section: do the **Do** steps, watch the **↻ Changed** + **Look for**
cues, then fill in the notes block.

---

## 1. First landing — Dashboard (Home tab)

**As:** builder
**Do:** after login you land on Home. Glance at it before doing anything.
**↻ Changed since round 1:**
- Greeting is now **time-based** ("Good morning/afternoon/evening, <name>") instead of "Hi".
- Date reads like **"Thursday, June 4"** instead of `2026-06-04`.
- The button accessibility warning in the console should be **gone**.
**Look for:**
- [ ] Greeting matches the actual time of day
- [ ] Date format feels right
- [ ] (If you can) open the browser console — no red warnings about buttons
- [ ] Bottom tab bar reachable with your thumb; "New list" obvious

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 2. Building your item catalog (Items tab)

**As:** builder
**Do:**
- Add 3–4 real prep items (e.g. "Diced onions", "Marinara", "Chicken stock").
- Give a couple a **default amount** (quantity + unit), leave others blank.
- Add a **description** to one (e.g. "stored in the walk-in, dice fine").
- In the unit picker, try **"+ Add a unit…"** to create a custom unit (e.g. "lexan", "6-pan").
- Edit an item. Try to delete one.
**↻ Changed since round 1:**
- "Par" is now **"Default amount"** — it prefills onto the list later (section 4).
- New **Description** field with hint text.
- Unit dropdown: opens as a normal dropdown you can **tap outside to close**; the **×**
  clears a chosen unit; **custom units** can be added inline and reused.
- After your first item, the add form **collapses to an "Add an item" button** (tap to reopen).
- Saved amounts are **pluralized** ("2 lbs", "1 case"); custom units show as you typed them.
**Look for:**
- [ ] Adding an item is fast; the collapse-to-button behavior feels right (or annoying?)
- [ ] The unit list has what you'd actually use — anything still missing?
- [ ] Closing the unit dropdown without picking is now obvious
- [ ] Clearing a chosen unit (×) works
- [ ] Adding a custom unit once, then reusing it, feels smooth
- [ ] Decimal default amounts work (`1.5`, `.5`)
- [ ] Plurals read correctly ("2 lbs", "1 lb")
- [ ] Description hint is helpful; empty state reads well

```
👍 Likes:
👎 Dislikes:
💡 Ideas (missing units? other fields you wish it had?):
```

---

## 3. Creating a prep list (Lists tab → New list)

**As:** builder
**Do:** tap **New list**, give it a title (the placeholder no longer says "Tonight's prep"),
pick a date, create it.
**↻ Changed since round 1:**
- Title placeholder is now a neutral hint ("e.g. Friday a.m. prep").
**Look for:**
- [ ] Title + date step is quick and obvious
- [ ] Date defaults to today
- [ ] Calendar picker feels OK on a phone
- [ ] After creating, you land on the list ready to add items

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 4. Adding items to the list (the builder screen)

**As:** builder
**Do:**
- Add several items: pick an item, check the quantity + unit, optionally tweak them,
  add a **prep note**, and **star** one or two as priority.
- Pick an item that has a default amount, then switch to one that doesn't — watch the
  quantity/unit fields.
- Edit an entry. Remove an entry. Use the **Done** button when finished.
**↻ Changed since round 1:**
- Picking an item now shows its **name** in the box (no more long ID string).
- Quantity + unit **prefill from the item's default amount** (still editable); switching
  to an item with no default clears them.
- You can add a **prep note** (instructions) right when adding the item.
- A **Done** button at the bottom takes you off the page.
- Units here are pluralized too.
**Look for:**
- [ ] The item box shows the real name after you pick it
- [ ] Prefill saves you the double-entry; overriding still works
- [ ] Prep note is easy to add and clearly "instructions for the cook"
- [ ] Starred items float to the top; the star is easy to tap
- [ ] Editing/removing feels safe (no accidental taps); buttons big enough
- [ ] Progress bar updates; **Done** goes where you expect

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 5. Working the list as a cook

**As:** cook (the execution account — second browser/incognito)
**Do:** open the same prep list.
**↻ Changed since round 1:**
- The builder's **prep note** shows **read-only** to you.
- You now have your **own** "Add your own note" — it no longer overwrites the chef's note.
- When everything's done, an **"All done — nice work!"** banner appears.
**Look for:**
- [ ] You can **see** the list but **not** add/edit/remove/star controls
- [ ] Tapping a row marks it **done** (tap again to undo); the target is big and forgiving
- [ ] A done row clearly looks done (check, strike-through) and shows **"Done by [name]"**
- [ ] The chef's prep note is visible but not editable by you
- [ ] Your own note saves separately and both notes show
- [ ] Finishing the list feels satisfying (the all-done banner)

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 6. Seeing progress + notes as the builder

**As:** builder (switch back)
**Do:** refresh the list and check the dashboard.
**Look for:**
- [ ] Completed items + counts reflect what the cook did (refresh to update)
- [ ] The cook's note is visible to you, **separate** from your prep note
- [ ] On Home, today's list shows up with the right progress
- [ ] On the Lists tab, each list shows done/total; a finished list shows a check

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 7. Managing the team (Team tab)

**As:** builder/management
**Do:**
- Look at the roster.
- Toggle **Allow list creation** for the cook; have them refresh — they should now see
  the builder controls.
- **Deactivate** the cook, then have them refresh.
- Reactivate them.
- Try to act on **yourself** and on the **owner**.
**↻ Changed since round 1:**
- A deactivated person is now **fully locked out** — instead of still seeing lists, they
  hit an **"Account deactivated"** screen (even on a direct list link).
**Look for:**
- [ ] Roster is readable (names, roles, who can create lists, who's inactive)
- [ ] Granting list access actually unlocks building for that person
- [ ] Deactivating drops them to the lockout screen — no list/data visible at all
- [ ] Reactivating restores access
- [ ] You can't deactivate yourself or the owner

```
👍 Likes:
👎 Dislikes:
💡 Ideas:
```

---

## 8. Restaurant settings (NEW — gear icon, management only)

**As:** builder/management
**Do:**
- Tap the **gear icon** in the top header → Settings.
- Edit the **restaurant name** and **timezone**, save.
- Under **Custom units**, remove a unit you added earlier.
- As the **cook**, try to open Settings — you should be blocked.
**Look for:**
- [ ] Gear only shows for management; the page opens
- [ ] Name/timezone save (confirmation shows); timezone change reflects on Home's date
- [ ] Custom units list + remove works
- [ ] A non-management user can't reach it

```
👍 Likes:
👎 Dislikes:
💡 Ideas (what else belongs on a settings page?):
```

---

## 9. Overall feel

**Look for:**
- [ ] Moving between tabs is quick and never confusing
- [ ] Nothing is too small to tap with one thumb / greasy hands
- [ ] Text is readable on a small screen
- [ ] Wording sounds like a kitchen, not software
- [ ] Anything that made you hesitate or re-read

```
Biggest 3 things I'd change:
1.
2.
3.

What felt good:

Did the round-1 fixes land the way you wanted? (units/plurals, dropdowns, the item-name
bug, separate cook notes, deactivation, default-amount prefill):

Anything still missing for a real kitchen:
```

---

### When you're done

Hand this back with your notes filled in and we'll turn the dislikes/ideas into the next
round of changes. Same Phase 2 boundaries still apply (so don't flag these as missing): no
Spanish/translation yet, no recipes, no photos, no live auto-refresh, no offline — those
are later phases.
