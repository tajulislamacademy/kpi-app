# Account Management — Audit & Redesign Proposal

**Author:** Claude (senior frontend + product engineer)
**Date:** 2026-06-07
**Trigger:** The page is titled **"Account Management" (অ্যাকাউন্ট ম্যানেজমেন্ট)** but
only lets the admin create/approve **parent** accounts. Name ≠ scope.

---

## 1. The problem in one line

"Account Management" promises *all accounts*, but delivers *parents only*. The
other three roles' accounts (admin, teacher, student) are created and
password-managed **elsewhere**, so the page name is misleading and there is no
single place to see "who can log in".

---

## 2. How accounts actually work today (ground truth)

Every login-capable user is the **same shape** regardless of role:
- a `profiles` row: `system_id`, `role`, `name`, `auth_id`
- an optional Supabase **Auth user** (created via `provisionAuthUser`, a secondary
  client) — linked through `profiles.auth_id`
- login email is derived: `systemIdToEmail(system_id)` → `<id>@kpiapp.com`
  (root admin special-cased to `admin@kpi.local`)
- password reset uses the `admin_set_password` RPC; granting a login to a
  login-less record provisions a new auth user and sets `auth_id`
- **no `auth_id` ⇒ cannot log in** (the login flow looks the profile up by
  `auth_id`)

So credential management is **uniform** — but the UI for it is **scattered**:

| Role | Where the account is created / password reset | Extra |
|------|----------------------------------------------|-------|
| Admin | Seeded once (dashboard), special-cased | — |
| Teacher | **Teachers page** (`createTeacher`/`updateTeacher`) | class/subject/guide assignments |
| Student | **Students page** (`createStudent`/`updateStudent`) | class/section/roll |
| Parent | **Accounts page** (`createParent`/`updateParent`) | links to a student + **approval status** |

### Why parents ended up alone on this page
Parents are the only role that:
- has **no domain page** of its own (teachers/students do), and
- carries an **approval workflow** (`pending / approved / rejected`) gating login.

So "Account Management" was really built as *"Parent account + approval queue"*.
The generic title was aspirational.

---

## 3. Options to fix

### Option A — Rename (smallest)
Rename the page/nav to **"Parent Accounts" (অভিভাবক অ্যাকাউন্ট)**. Honest, 10-minute
change. Teacher/student credentials stay in their domain pages.
- ✅ Trivial, no risk, removes the false promise.
- ❌ Still no single "who can log in / reset anyone's password" view. Credential
  ops stay scattered.

### Option B — Full account hub (largest)
Turn it into a true cross-role console: list **every** `profiles` row with role
tabs, login status, and full credential + lifecycle actions; move teacher/student
*account* creation here too.
- ✅ One place for everything.
- ❌ Big; duplicates/centralizes role-specific create forms (class assignments,
  roll…) that genuinely belong to the domain pages. Risk of two places creating
  the same entity.

### Option C — Access hub + domain creation (recommended) ⭐
Split responsibilities cleanly:
- **Domain pages keep entity creation** (Teacher with assignments, Student with
  class/roll, Parent with linked student) — because each needs role-specific
  fields. This already works; don't move it.
- **Account Management becomes the cross-role *access* console**: a read-across
  view of all accounts with **credential + access** actions that are identical
  for every role:
  - search/filter by role + login status
  - **reset password** (`admin_set_password`)
  - **grant login** to a login-less record / **revoke login** (null `auth_id`)
  - **approve / reject** (parents)
  - **delete** account
  - quick "jump to edit in domain page" for role-specific fields

This matches the data model (credentials are uniform; entity fields are not) and
makes the title true without duplicating create forms.

---

## 4. Recommended design (Option C) — detail

### Layout
`Account Management`
- **Stat row:** total accounts · with-login · login-less · pending-parents.
- **Tabs:** All · Admins · Teachers · Students · Parents · (Pending) .
- **Search** (Combobox/Input) by name / system-id.
- **Table** columns: System ID · Name · Role (Badge) · Login (✓ has `auth_id`
  / "no login" Badge) · Status (parents) · Actions.
- **Row actions** (kebab / inline icons):
  - Reset password (Dialog → new password)
  - Grant login (if login-less) / Revoke login (if has login)
  - Approve / Reject (parents, when pending)
  - Delete (AlertDialog)
  - "Edit details ↗" → routes to Teachers/Students/Accounts entity editor
- Keep **"+ Add Parent"** here (parents have no domain page). Add buttons for
  teacher/student route to their pages ("Add in Teachers ↗").

### Data layer (new, small)
- `listAccounts()` — `select * from profiles` (admin RLS already allows) +
  left-join role tables for status/specifics. Returns
  `{ id, systemId, name, role, hasLogin: !!auth_id, status? }`.
- Reuse existing `admin_set_password` RPC for reset.
- `grantLogin(profileId, systemId, password)` = `provisionAuthUser` + set
  `auth_id` (already the pattern in update*).
- `revokeLogin(profileId)` = `profiles.update({ auth_id: null })`. **Note:** this
  blocks app login (login resolves by `auth_id`) but leaves the orphan Auth user
  in Supabase — full deletion needs a service-role Edge Function (out of scope;
  document it).
- `deleteAccount(profileId)` = delete profiles row (cascades to role row).

### RLS / security
- All actions are admin-only — already enforced by existing RLS + the
  `admin_set_password` RPC. No new policies needed for read/update/delete of
  profiles (admin policy exists). Verify an admin policy covers `profiles`
  SELECT across roles.
- `revokeLogin` via nulling `auth_id` is the pragmatic client-only "disable".
  True auth-user deletion/disable is a documented future Edge Function.

---

## 5. Effort & rollout

| Step | Scope | Effort |
|------|-------|--------|
| A (rename) ship now | nav + title | ~10 min |
| C-1 data layer | `listAccounts`, `grantLogin`, `revokeLogin`, `deleteAccount` | ~30–45 min |
| C-2 UI | tabs + table + actions (reuse Combobox/Table/Dialog/AlertDialog/Badge) | ~1–1.5 h |
| C-3 wire domain "Add/Edit ↗" links | small | ~20 min |

Recommended path: **do A immediately** (stop the lie), then build **C** as the
real fix. C reuses everything already built in the UI polish pass (Table,
Dialog, AlertDialog, Badge, Combobox, EmptyState) so it's mostly assembly.

---

## 6. Open questions for you

1. Should **revoke login** (disable) be in scope now, or just reset-password +
   delete? (Disable = null `auth_id`; full auth-user delete needs an Edge
   Function later.)
2. Do parents still **self-register** anywhere (that's what the `pending` queue
   implies), or are they always admin-created? If always admin-created, the
   approval workflow can be simplified.
3. Keep teacher/student **account creation** in their domain pages (recommended),
   or centralize here (Option B)?

Tell me 1–3 and I'll implement (A first, then C).
