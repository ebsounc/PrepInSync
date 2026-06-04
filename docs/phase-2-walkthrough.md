# Phase 2 walkthrough — core prep workflow

A self-guided run through everything built in Phase 2. Go screen by screen, do the
actions, and write down what you like / don't like / want changed. There are no wrong
answers here — this is about how it *feels*, especially on a phone.

> **Tip:** do at least one full pass on your actual phone (open the dev URL on your
> phone's browser, or use your desktop browser's narrow/mobile view). This app lives
> in an apron pocket — desktop will feel fine even when the phone doesn't.

---

## Setup (5 min)

1. Start the app: run `npm run dev` and open http://localhost:3000.
2. **You need two accounts in the same restaurant** to feel the whole loop:
   - a **builder** (a chef/manager who creates lists), and
   - a **cook** (an execution user who works the list).
3. Getting accounts — pick one:
   - **Easiest:** ask me (Claude) to seed two confirmed test accounts in one restaurant
     and tell you the logins. Then skip to the walkthrough.
   - **Real flow:** sign up with your email, confirm via the email, and complete
     onboarding (this makes you the **owner** = a builder). To test the cook side,
     invite a second person from the Team page using a second email you can access,
     or just ask me to seed the cook account.
4. To switch between the two accounts, use a second browser or a private/incognito
   window so you can be the builder in one and the cook in the other side by side.

How to read each section: do the **Do** steps, watch for the **Look for** cues, then
fill in the notes block.

---

## 1. First landing — Dashboard (Home tab)

**As:** builder
**Do:** after onboarding/login you land on Home. Glance at it before doing anything.
**Look for:**
- [ ] Greeting + today's date feel right
- [ ] "Today's prep" area is clear even when empty
- [ ] The bottom tab bar (Home / Lists / Items / Team) is easy to reach with your thumb
- [ ] "New list" button is obvious

```
👍 Likes:The icons  at the bottom look nice and simple. 
👎 Dislikes: Obviously, the UI needs lots of work to get it right, but I like this first draft. Date format could be cleaner, I'd say. Something about it just looks off. Getting some warnings about issues with the buttons. "Base UI: A component that acts as a button expected a native <button> because the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, which can impact forms and accessibility. Use a real <button> in the `render` prop, or set `nativeButton` to `false`.
    at Button (about://React/Server/C:%5Ccode%5Ckitchen-app%5C.next%5Cserver%5Cchunks%5Cssr%5C%5Broot-of-the-server%5D__47bb5885._.js?35:647:263)
    at DashboardPage (about://React/Server/C:%5Ccode%5Ckitchen-app%5C.next%5Cserver%5Cchunks%5Cssr%5C%5Broot-of-the-server%5D__46759b88._.js?48:328:298)"
💡 Ideas: We could do time-based, like reading messages like "Good morning" if it's 4:11, or "Good afternoon" if it's past lunch. 
```

---

## 2. Building your item catalog (Items tab)

**As:** builder
**Do:**
- Add 3–4 real prep items (e.g. "Diced onions", "Marinara", "Chicken stock").
- Give a couple of them a **par** (quantity + unit), leave others blank.
- Edit one item. Try to delete one.
**Look for:**
- [ ] Adding an item is fast and the form is clear
- [ ] The unit picker has the units you'd actually use (lb, kg, oz, g, qt, L, gal, case, each) — anything missing?
- [ ] Decimal quantities work (try `1.5`, and `.5`)
- [ ] Edit/delete are easy to find and the touch targets feel big enough
- [ ] Empty state (before any items) reads well

```
👍 Likes:  I like that there is an edit button after you save an item. 
👎 Dislikes: When you click on the PAR unit and it opens up the Drop down menu: there is no way to click out other than clicking up, so let's add an X button or add that functionality at the bottom of the list too. So if you selected a PAR unit and then decided you didn't want that, there's no way to uncheck it either. This goes for mainly the whole site, but I find the prefilled text helpful. Something about it is hard to tell. It needs to look better. The weights: I don't know if this would be easy or not, but we should make it so that there's plural if necessary. Right now I have diced onions and it says 2 lb. I could say lbs. 
💡 Ideas (missing units? fields you wish it had?): Missing units is big, like a tray, for example. That's something we want to look more into, but also we could just add another option. Which would also save on whoever's account as a choice after they put it in the first time An option for a description would be nice on items, just in case they're stored in a weird spot per se. And maybe inside the text box we could have ideas of what to say, such as location or special instructions. I don't know if spellcheck is built into certain machines, but it would be nice to have if it's not. For items and inventory, par level is probably a whole lot less normalized. Maybe we could make that an entire dropdown menu, like "Add par level", instead of just having it under "Name". We could replace that with "Description" and have a dropdown for par. In the items tab, I think it's nice to have the item creation menu open when you don't have an item yet, but afterwards can we just make that a button that just drops down a menu? Unless you think it's a bad idea to have that many nested dropdown menus. 
```

---

## 3. Creating a prep list (Lists tab → New list)

**As:** builder
**Do:** tap **New list**, give it a title (e.g. "Tonight's prep") and a date, create it.
**Look for:**
- [ ] Title + date step is quick and obvious
- [ ] Date defaults to today
- [ ] After creating, you land on the list ready to add items

```
👍 Likes: 
👎 Dislikes: I don't like the autofill text for the list title, because usually you create lists for the next morning. I haven't tested anything on phone yet , but calendar selection might need a look. 
💡 Ideas:  Maybe in a future scope, we could add an option to assign lists to certain people. But also might not be necessary to revisit that 
```

---

## 4. Adding items to the list (the builder screen)

**As:** builder
**Do:**
- Add several items: pick an item, set a quantity + unit, and **star** one or two as priority.
- Add the *same* item twice with different quantities (this is allowed on purpose — tell me if you'd rather it be blocked).
- Edit an entry's quantity. Remove an entry.
**Look for:**
- [ ] The add row (item → qty → unit → star → Add) flows naturally on a phone
- [ ] **Starred items float to the top** of the list
- [ ] The star is clearly "priority" and easy to tap
- [ ] Editing and removing an entry feel safe (no accidental taps)
- [ ] The progress bar at the top updates as expected

```
👍 Likes: Being able to star items is nice. 
👎 Dislikes: When you click on an item, the text box fills with a crazy string instead of the name of the item. Units are still not plural on this, so we definitely need that. 
💡 Ideas (is single-page inline-add the right feel, or would you rather a separate "add items" screen?): Okay, this is a big one. When you make the items, let's have it so that Where the par amount is now, we have that as a little dropdown menu at the bottom, but instead we have a standard serving or a standard amount to make. And then when you go to the list maker, you pick how many of that standard recipe you want to make, and it has that same unit. Because selecting the quantity both times is redundant. lets also be able to add a note before you add it to the list. Definitely need a save list button, even if it's already saved, that just directs you off of the page.
```

---

## 5. Working the list as a cook

**As:** cook (the execution account — second browser/incognito)
**Do:** open the same prep list.
**Look for:**
- [ ] You can **see** the whole list, but **cannot** see add / edit / remove / star controls
- [ ] Tapping a row marks it **done** (and tapping again un-does it) — the target is big and forgiving
- [ ] A completed row clearly looks done (check, strike-through) and shows **"Done by [your name]"**
- [ ] You can add a **note** to an item ("we're out of cilantro", "half a case left")

```
👍 Likes: I like that the name is crossed off and it has a "done by". That's great. Unchecking works well too. 
👎 Dislikes: You can add a note, but it's the same note that the chef left. Maybe an "Add your own note" button instead. 
💡 Ideas (does completing an item feel satisfying / obvious enough?):Some sort of indication other than the progress bar that the list is completed. Maybe a nice touch, like a green check or something next to the name For example, let's revisit it later. 
```

---

## 6. Seeing progress + notes as the builder

**As:** builder (switch back)
**Do:** refresh the list and check the dashboard.
**Look for:**
- [ ] Completed items + counts reflect what the cook did (refresh to update — live sync is a later phase)
- [ ] The cook's **note** is visible to you
- [ ] On Home, today's list shows up with the right progress
- [ ] On the Lists tab, each list shows done/total

```
👍 Likes: Just noticed the star functionality of putting stuff at the top works well. Home progress bar looks good. All updates seem to be working well. Same on the list page. Good job with this one. 
👎 Dislikes:
💡 Ideas (is "refresh to see updates" acceptable for now, or does it need to be live?): Refresh seems to be working fine. One thing to take note of is how often a phone is going to be refreshing, because if it's like once every 30 minutes or so, I would assume that's fine, or once every app open. 
```

---

## 7. Managing the team (Team tab)

**As:** builder/management
**Do:**
- Look at the roster.
- Toggle **Allow list creation** for the cook, then have the cook refresh — they should now see the builder controls on a list.
- **Deactivate** a member, then reactivate them.
- Try to act on **yourself** and on the **owner**.
**Look for:**
- [ ] Roster is readable (names, roles, who can create lists, who's inactive)
- [ ] Granting list access actually unlocks building for that person
- [ ] You can't deactivate yourself or the owner (controls are hidden/blocked)
- [ ] Deactivating clearly marks someone inactive

```
👍 Likes:
👎 Dislikes: Same thing with the unit list: we need an option to cancel out of the drop-down menu for roles. 
💡 Ideas: It's good that deactivating an account makes it unable to edit things, but let's also just make it so you can't see the list Because I can still see new lists that are created even after the accounts are deactivated So we could maybe just make a different landing page that just says "Account deactivated" or something. Or maybe just not even allow them to log in. 
```

---

## 8. Overall feel

**Look for:**
- [ ] Moving between tabs is quick and never confusing
- [ ] Nothing is too small to tap with one thumb / greasy hands
- [ ] Text is readable on a small screen
- [ ] Wording sounds like a kitchen, not software
- [ ] Anything that made you hesitate or re-read

```
Biggest 3 things I'd change:
1. UI just needs a massive overhaul in many aspects, but that's just something for later, I assume. 
2. Drop-down menus are rough right now. Definitely needs a fix according to what I've noted. Along with adding plurals And more units. 
3. Some things are too small for mobile, such as adding notes and its remove buttons. I can be more specific later, but it's worth increasing the size of some of the smaller things. 

What felt good:
I like how only the list for today comes up on today's prep on the home page. 
Anything missing for a real kitchen: In the future, we definitely want a way to edit the restaurant information. Maybe another tab for whoever creates the restaurant plus higher-ups. Mobile interface was, for the most part, good, other than a few things needing button adjustments. 
```

---

### When you're done

Hand this back with your notes filled in and we'll turn the dislikes/ideas into the
next round of changes. Remember the deliberate Phase 2 boundaries (so you don't need to
flag these as missing): no Spanish/translation yet, no recipes, no photos, no live
auto-refresh, no offline — those are later phases.
