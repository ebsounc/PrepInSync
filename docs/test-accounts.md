# Test account logins

Dev/testing accounts on the Supabase **dev** project. Two restaurants (tenants) so you can
test the builder ↔ cook loop and restaurant isolation.

> ⚠️ These are disposable **test** accounts on a dev database — not real users, not real
> secrets. Still, this file lists passwords, so if you'd rather not track that in git, tell
> me and I'll add it to `.gitignore`. Don't reuse `QaTest1234!` anywhere real.

The shared password for every seeded account below is **`QaTest1234!`**
(Elijah's account uses your own personal password — not listed here).

---

## Restaurant: "test kitchen0"  *(your main test restaurant)*

| Name | Email | Password | Role | Builds lists? |
|---|---|---|---|---|
| Elijah Overcash | elijahblueover@gmail.com | *(your own)* | owner | yes |
| Tony Baloney | tony@kitchenapp.test | `QaTest1234!` | head chef | yes |
| Sam Rivera | sam@kitchenapp.test | `QaTest1234!` | prep chef | yes *(granted; prep chef is normally cook-only)* |

To test the **cook** side here, revoke Sam's list access on the Team page (or change his
role), or just use the QA pair below.

## Restaurant: "QA Test Kitchen (edited)"  *(isolated QA sandbox)*

| Name | Email | Password | Role | Builds lists? |
|---|---|---|---|---|
| Bianca Builder | qa.builder@example.com | `QaTest1234!` | owner | yes (builder) |
| Carlos Cook | qa.cook@example.com | `QaTest1234!` | line cook | no (cook) |

This pair is the cleanest **builder + cook** setup — already in the right roles for the
full loop, and fully isolated from your main restaurant.

---

## Notes

- Login is at `/login`. Switch accounts with a second browser or a private/incognito window
  so you can be the builder and the cook side by side.
- Forgot/changed a password? Ask me — I can reset any seeded account's password via the
  Supabase admin API (works even when the direct DB connection is down).
- Need another account (e.g. a second cook, or a specific role)? Ask me to seed one.
- All accounts above are currently **active**.
