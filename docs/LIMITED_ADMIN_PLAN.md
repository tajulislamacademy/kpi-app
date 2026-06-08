# Limited-Permission Admins — Design & Plan

**Author:** Claude · **Date:** 2026-06-08
**Goal:** Let the root admin create/promote admins with a **subset** of admin
powers (e.g. an admin who can only do point-entry + reports, or only manage
students), instead of today's all-or-nothing admin.

---

## 1. Current state

An admin = **full access**. Two ways to be admin:
- `profiles.role = 'admin'` (dedicated admin), or
- `profiles.is_admin = true` (promoted user — migration 0011).

`App.tsx` derives `isAdmin = role==='admin' || is_admin` and every admin nav
item / route is gated by that single boolean. RLS (migration 0011) grants any
admin **write access to every table**. There is no notion of "partial" admin.

So today, a promoted admin can do *everything*. To make them *limited*, we must
introduce **capabilities** and check them in BOTH the UI and (for real security)
RLS.

---

## 2. Capability model

One capability per admin area (maps 1:1 to the admin nav items):

| Capability key | Area / nav | Sensitivity |
|---|---|---|
| `point_entry`   | পয়েন্ট এন্ট্রি (student KPI entry) | low |
| `teacher_kpi`   | শিক্ষক KPI entry | low |
| `parent_kpi`    | অভিভাবক KPI entry | low |
| `view_reports`  | রিপোর্ট | low |
| `manage_students` | শিক্ষার্থী CRUD | medium |
| `manage_teachers` | শিক্ষক CRUD | medium |
| `manage_parents`  | অভিভাবক CRUD | medium |
| `manage_questions`| প্রশ্নমালা CRUD | medium |
| `manage_settings` | সেটিংস (term config, seed) | medium |
| `manage_accounts` | Account Management: reset/grant/revoke login | **high** |
| `manage_admins`   | promote/demote others to admin | **highest** (root-only by default) |

**Effective capabilities:**
- `is_root` → **all** capabilities (incl. `manage_admins`). Never editable.
- `role = 'admin'` (dedicated admin) → **all** capabilities (full admin, legacy).
- `is_admin = true` (promoted) → exactly `profiles.permissions` (the chosen subset).

A "full admin" can still be made by granting all keys, or by keeping
`role='admin'`. A "limited admin" = `is_admin=true` + a chosen `permissions` set.

### Optional presets (nicer UX than free-form checkboxes)
- **Data-entry admin:** `point_entry, teacher_kpi, parent_kpi, view_reports`
- **Academic admin:** `manage_students, manage_teachers, manage_questions, manage_settings, view_reports`
- **Account admin:** `manage_parents, manage_accounts, view_reports`
- **Custom:** pick any keys.

---

## 3. Data model (migration)

```sql
alter table public.profiles
  add column if not exists permissions text[] not null default '{}';
```
- Empty `{}` for non-admins and for `role='admin'`/root (they're "all" via the
  effective-caps rule, so the array is ignored for them).
- For promoted limited admins, holds the granted keys.

A capability predicate for RLS (SECURITY DEFINER, mirrors `my_role()`):
```sql
create or replace function public.has_cap(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select is_root
        or role = 'admin'
        or (is_admin and cap = any(permissions))
    from public.profiles where auth_id = auth.uid()
  ), false)
$$;
```

---

## 4. Frontend (session + gating)

- `SessionUser` gains `permissions: string[]` (and keep `isAdmin`).
- `loadSessionUser`: set `permissions = is_root||role==='admin' ? ALL_CAPS : (is_admin ? prof.permissions : [])`.
- Helper `can(user, cap)` = `user.isRoot || user.role==='admin' || user.permissions.includes(cap)`.
- `App.tsx` nav + routes: gate each admin entry by its capability instead of the
  blanket `isAdmin`. e.g. teachers item shows only if `can(u,'manage_teachers')`;
  `pointEntry` if `can(u,'point_entry')`; etc. `isAdmin` still decides "has any
  admin panel at all".
- Account Management: only visible with `manage_accounts`; the promote/demote
  action only with `manage_admins` (root by default).

---

## 5. RLS enforcement — the security crux

UI gating alone is **not secure**: a limited admin could still call the Supabase
API directly. For true limits, the table write policies must check capabilities.

Today (0011) every admin policy is `is_admin_user()` = role='admin' OR is_admin
→ blanket. To make limits real, swap the blanket check for the matching
capability on each table:

| Table | policy check becomes |
|---|---|
| students  | `my_role()='admin' OR has_cap('manage_students')` |
| teachers  | `my_role()='admin' OR has_cap('manage_teachers')` |
| parents   | `my_role()='admin' OR has_cap('manage_parents')` |
| questions / term_config | `... OR has_cap('manage_questions' / 'manage_settings')` |
| kpi_entries | `... OR has_cap('point_entry')` (+teacher/parent kpi as today) |
| profiles  | read: any admin; write: `... OR has_cap('manage_accounts')`; admin-promotion writes guarded to `has_cap('manage_admins')` |

`admin_set_password` body: require `has_cap('manage_accounts')`.

> ⚠️ Same surface that broke before — so do it **carefully**: one migration, test
> `has_cap()` returns true for the root admin BEFORE switching policies, keep a
> tested rollback, and apply in a low-traffic window. (See the stale-session
> lesson: a blank app after deploy is usually re-login, not RLS — but a real
> has_cap typo WOULD block reads, so verify.)

---

## 6. UI for assigning permissions

In **Account Management** (requires `manage_admins`):
- "Make admin" opens a dialog with capability **checkboxes** (or a preset
  dropdown + custom). Saving = `is_admin=true, permissions=[...]`.
- An existing limited admin row gets an "Edit permissions" action.
- `role='admin'` and root rows show "Full admin" (no checkboxes; not editable).
- API: `setAdminPermissions(id, caps[])` = update `{ is_admin: true, permissions: caps }`;
  demote = `{ is_admin: false, permissions: '{}' }`.

---

## 7. Edge cases / guards
- Root (`is_root`) = all caps, never demotable/editable (DB trigger already
  protects role; extend to block permission edits on root).
- `manage_admins` default **root-only**; optionally let a full admin grant it.
- Don't let a limited admin escalate themselves — `manage_accounts`/`manage_admins`
  control who can edit permissions; without them the Account page is hidden +
  RLS on profiles writes blocks it.
- Last-admin / self-demote guards (as before).

---

## 8. Phasing & effort

| Phase | Scope | Security | Effort |
|---|---|---|---|
| **0** | migration: `permissions` column + `has_cap()` | — | ~15 min (user applies SQL) |
| **1** | frontend: SessionUser.permissions, `can()`, nav/route gating, Account-Mgmt permission dialog | UI-level (menus hidden) | ~2–3 h |
| **2** | RLS: per-table cap checks + `admin_set_password`/profiles guards | **DB-enforced** (real limits) | ~1–2 h + careful test |

**Recommendation:** ship **Phase 0 + 1** first (functional limited admins, menus
gated), then **Phase 2** to make the limits tamper-proof. Be explicit with the
user that until Phase 2, "limited" = UI convenience, not a hard security boundary.

---

## 9. Decisions needed from you
1. **Free-form capabilities, presets, or both?** (Recommend: presets + custom.)
2. **Who can create/limit admins** — root only, or any full admin? (Recommend:
   `manage_admins`, root-only by default.)
3. **Phase 2 (RLS) now or later?** If admins are all trusted staff, Phase 1 may
   suffice short-term; Phase 2 for real security.
4. Confirm the capability list in §2 matches the areas you want to gate.

Answer 1–4 and I'll implement Phase 0 (migration SQL) + Phase 1, then Phase 2.
