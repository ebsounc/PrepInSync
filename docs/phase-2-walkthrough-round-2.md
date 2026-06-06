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
👍 Likes:Date looks good. Greeting looks good. 
👎 Dislikes: So I'm doing a Chef account from my phone, and there is an issue on that page, but not on my desktop computer owner account. 
💡 Ideas: I think the view all prep list definitely needs rearranging and lots of UI, but so far I don't see any issues. One thing I'm noticing on the phone is that there's this bottom navigation bar just for a browser, and then ours is right above that. There's not much distinction, so I can see there being an issue with misinputs on the navigational bar and you accidentally go back or do something and switch tabs. In the future, it's worth noting that there definitely needs to be some distinction there. If we were to ever make like an app of this, that would not be an issue anymore. 
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
👍 Likes: Adding custom units seems to work nicely. Unit list is good, plus adding custom units I feel like works nicely. Clearing a chosen unit looks good. I like that I typed in 0.5 for an amount and it added a zero. Beautiful. Closing the drop down works nicely. The add an item button works upon refresh. I think that's fine. 
👎 Dislikes: I got this error when adding the plural of a custom unit. Base UI: A component is changing the default value state of an uncontrolled FieldControl after being initialized. To suppress this warning opt to use a controlled FieldControl. Also, the custom units don't have plurals, as of now. Maybe something worth looking into As far as LLM could do that. Drop down menu still needs work, but that's more of a UI thing. Functionality is good. 
💡 Ideas (missing units? other fields you wish it had?): Maybe a small button to add a par amount, Since many kitchens keep up with it. I don't want to over-complicate the adding an item menu, but I also would like there to be a feature for a par amount. It's worth discussing with me further on the best way to implement that. One idea I have would be to add it after you've already saved an item, but that seems counterintuitive. I also don't want to clutter up the adding an item menu. 
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
💡 Ideas: Since we're already using date stuff in a lot of places, could we make the hint change to be the next day's AM prep? Actually, I'm a little bit conflicted, because I think the use cases for today versus tomorrow when you make a list are just going to be very from restaurant to restaurant. A big idea that could amend this issue is if we had a field, maybe when you create your restaurant or in the restaurant settings page, where you default when you make your list. When I worked, they usually did it the night before, but there were some days that they did it the morning of. If we could make a setting where it's like, "When do you typically make your list, or do you make your list for the day or for the next day?" or something like a proper way of wording that Then we could have the default text and default date aligned to the restaurant's preferences. 
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
👍 Likes: Item box crazy string is fixed. Refill's good. Start items work well still. Editing/removing seems to work. 
👎 Dislikes: When you make an item and you make a prep note and add it to the list, it saves fine. And you can edit that prep note through the edit button, but then there's the ability to add a second note, which you edit by clicking on it. We should change the prep note To say instructions for cook E.g., dice find one-fourth inch. So it's a little bit more specific what that note is for. 
💡 Ideas: We should add a little safety check before adding the same item twice. Let's say I did ranch and I go to add ranch again. A little pop-up says, "Ranch already on the list. Add again or cancel?" Once we focus on UI, having the progress bar update cleanly, like a little slide, would be nice. And also having like A more definitive done screen. I already talked about this last change. Maybe a green progress bar or a green check mark, or maybe even confetti. That might be over the top. We'll come back to that. 
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
👍 Likes:Permission seems to be working well. Adding or completing items works well. On the phone, it all seems to be a good size. Everything except for UI looks pretty good on this page. And the note pretext is really nice. 
👎 Dislikes:Just to be more clear on who made what note, I like how the chef's note is called "Prep Note", but maybe we could have it so that on your screen it says "Your note" for the notes that the cooks add. On other people's screens, it would say, for example, "Sam's note" or "Elijah's note" if I made one. This opens up the possibility for multiple people adding nodes, which is pretty rarely ever going to happen, I feel like, but something we should account for. 
💡 Ideas: UI could make everything more clear: what's completed, what's not, what's starred. We'll get to that eventually. 
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
👍 Likes: Stuff looks good on this one. Just what I had in step five about the note names based on who made it, different from the prep note when adding item
👎 Dislikes: We should have an edit button on the list creation page so you can change the name and date of the list. Also, once you finish with the initial additions to the list, we should do the same thing on the item screen, where it's just an "Add to list" button instead of the entire dropdown menu being open all the time. 
💡 Ideas: On the homepage, since it's very empty and when it comes up with today's preps it's just a list, maybe we could implement just a preview-ish feature. Maybe either above or below the progress bar we just add the items on that list and then sort of have them checked off as they are in the thing. Nothing you could edit from that, but just a preview of what's done and what isn't. 
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
👍 Likes: Deactivating works well. Everything from the team page looks good. 
👎 Dislikes: The team invite thing is not centered on the page. I see why stuff that we will change eventually, but might as well do that while I'm looking At it now.
💡 Ideas: There definitely needs to be a change role button or just an edit button on the person. This is just an idea, but also a personal settings page might be necessary so you can change your name. Maybe you could enter a birthday. With a custom birthday message on the birthday, that'd be a nice touch. Right now it's a non-important issue, but it's the type of changes that bring it to life. Also, this is where things like translation preferences would live. And language Profile pictures would be cool too if we get around to that. 
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
👍 Likes: Can't reach it from a non-manager page. 
👎 Dislikes:We could work on the formatting for the time zones. Right now we have underscores In City Names It's correct in the drop-down menu, but when you type it in or when you pick one, it gets a little funky. 
💡 Ideas (what else belongs on a settings page?): An ability to upload your restaurant's icon would be really cool. I would make it feel more personal. Also, maybe an ability to transfer ownership on this page to another employee. And this is where the preference for when you create lists would also live, such as you create it for tomorrow or for today. 
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
1. Tweaks to how the list looks on the home page 
2.Tweaks to the settings and team settings pages, like permission switches and time preferences 
3. Tweaks in this creation, like the safety checks, the note creation, Editing list. And so on. 

What felt good: I'm not seeing any obvious bugs right now. Page navigation works great. Roles are working as intended. 

Did the round-1 fixes land the way you wanted? (units/plurals, dropdowns, the item-name
bug, separate cook notes, deactivation, default-amount prefill):

Anything still missing for a real kitchen: Just the personalization that I've talked about in many of the other steps. 
```

---

### When you're done

Hand this back with your notes filled in and we'll turn the dislikes/ideas into the next
round of changes. Same Phase 2 boundaries still apply (so don't flag these as missing): no
Spanish/translation yet, no recipes, no photos, no live auto-refresh, no offline — those
are later phases.
