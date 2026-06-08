# Limited-Permission Admins — Design & Plan

**Author:** Claude · **Date:** 2026-06-08 (rev 2)
**Goal:** Let the **super admin** create admins with a fine-grained **subset** of
powers — down to **per-resource × per-action** (Create / Edit / Soft-delete /
Force-delete / View). The super admin (root) always has **every** right.

---

## 1. Super admin (you)

`profiles.is_root = true` = **super admin** → implicitly holds **all**
capabilities forever; never editable/demotable (DB trigger already protects role,
we'll extend it to permissions). Everything below is about *other* admins.

---

## 2. Current state

Admin = all-or-nothing (`role='admin'` or `is_admin=true` → full access; RLS 0011
grants every admin write to every table). No partial admin, and deletes are
**hard** (row removed immediately). We add (a) a capability matrix and (b) a
soft-delete/restore layer.

---

## 3. Permission model — resource × action matrix

Key format: **`<resource>.<action>`**.

**Resources with full CRUD:** `students`, `teachers`, `parents`, `questions`
**Actions:** `view`, `create`, `edit`, `soft_delete`, `force_delete`, `restore`

→ e.g. `students.create`, `students.edit`, `students.soft_delete`,
`students.force_delete`, `students.restore`, `students.view`.

**Non-CRUD areas (single capability each):**

| Capability | Area |
|---|---|
| `point_entry` | student KPI entry |
| `teacher_kpi` | teacher KPI entry |
| `parent_kpi` | parent KPI entry |
| `reports.view` | reports |
| `settings.edit` | term config + seed |
| `accounts.manage` | reset / grant / revoke login (Account Mgmt) |
| `admins.manage` | promote/demote & set others' permissions (**super-admin default**) |

**Effective capabilities:**
- `is_root` → **ALL** (super admin).
- `role='admin'` (legacy dedicated admin) → **ALL** (full admin).
- `is_admin=true` (promoted) → exactly `profiles.permissions`.

This maps cleanly to Postgres RLS (which is per-command):

| Action | Postgres | Enforced by |
|---|---|---|
| view | SELECT policy | `<res>.view` |
| create | INSERT policy | `<res>.create` |
| edit | UPDATE policy | `<res>.edit` |
| force_delete | DELETE policy | `<res>.force_delete` |
| soft_delete / restore | UPDATE of `deleted_at` (via RPC) | `<res>.soft_delete` / `<res>.restore` |

### Presets (quick assign; still editable)
- **Data-entry:** `point_entry, teacher_kpi, parent_kpi, reports.view, *.view`
- **Academic:** students/teachers/questions `view,create,edit,soft_delete` + `settings.edit, reports.view`
- **Account:** parents `view,create,edit,soft_delete` + `accounts.manage, reports.view`
- **Custom:** tick any keys. (Force-delete is high-risk → off by default in presets.)

---

## 4. Soft delete vs force delete (new feature)

Today delete = permanent. We add a recoverable tier.

- **Schema:** add `deleted_at timestamptz` (null = active) to `students`,
  `teachers`, `parents`, `questions`. (Optionally `kpi_entries` later.)
- **Soft delete** (`<res>.soft_delete`): set `deleted_at = now()`. Row hidden from
  normal lists; login-capable people with a soft-deleted profile should be blocked
  at login (treat like revoked).
- **Trash view + Restore** (`<res>.restore`): **every list page** gets a
  filtering bar with an **Active / Trash** toggle (plus the existing search and
  role/status filters); the Trash view lists soft-deleted rows; restore sets
  `deleted_at = null`. Filtering system is shared across students/teachers/
  parents/questions (search + status + active/trash).
- **Force delete** (`<res>.force_delete`): permanent row DELETE (cascades to
  profile). Available from Trash (and/or directly for high-privilege admins).
- **Lists filter** `deleted_at is null` by default everywhere (api `toUi`/queries).
- Implement soft_delete/restore via SECURITY DEFINER RPCs that check the cap, so
  the distinct permission is DB-enforced (a plain UPDATE policy can't tell a
  `deleted_at` change from a name change).

---

## 5. Data model (migration)

```sql
-- granular permissions
alter table public.profiles add column if not exists permissions text[] not null default '{}';

-- soft delete
alter table public.students  add column if not exists deleted_at timestamptz;
alter table public.teachers  add column if not exists deleted_at timestamptz;
alter table public.parents   add column if not exists deleted_at timestamptz;
alter table public.questions add column if not exists deleted_at timestamptz;

-- capability predicate (root/full-admin = all; promoted = their array)
create or replace function public.has_cap(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select is_root or role='admin' or (is_admin and cap = any(permissions))
    from public.profiles where auth_id = auth.uid()
  ), false)
$$;
```

---

## 6. Frontend (session + per-action gating)

- `SessionUser.permissions: string[]`; `loadSessionUser` sets it to ALL for
  root/role-admin else `prof.permissions`.
- `can(user, cap)` = `user.isRoot || user.role==='admin' || permissions.includes(cap)`.
- Gating granularity:
  - **Nav/page**: show if `can(u, '<res>.view')` (or the area cap).
  - **"+ Add" button**: `can(u,'<res>.create')`.
  - **Edit action**: `can(u,'<res>.edit')`.
  - **Soft-delete (Trash) action**: `can(u,'<res>.soft_delete')`.
  - **Force-delete action** (in Trash): `can(u,'<res>.force_delete')`.
  - **Restore**: `can(u,'<res>.restore')`.
- Each list page gets an active/Trash toggle (Trash visible with any soft_delete/
  restore/force_delete cap).

---

## 7. RLS enforcement (real limits, Phase 2)

Per table, split the single admin policy into command-scoped policies:
```sql
-- students (same shape for teachers/parents/questions)
drop policy if exists students_admin_all on public.students;
create policy students_view   on public.students for select using (my_role()='admin' or has_cap('students.view'));
create policy students_create on public.students for insert with check (my_role()='admin' or has_cap('students.create'));
create policy students_edit   on public.students for update using (my_role()='admin' or has_cap('students.edit')) with check (my_role()='admin' or has_cap('students.edit'));
create policy students_delete on public.students for delete using (my_role()='admin' or has_cap('students.force_delete'));
```
- Soft-delete & restore go through `soft_delete_row(res,id)` / `restore_row(res,id)`
  SECURITY DEFINER RPCs that check the matching cap then update `deleted_at`.
- `profiles` writes: `accounts.manage`; admin-promotion / permission edits:
  `admins.manage`. `admin_set_password` body requires `accounts.manage`.
- Keep `my_role()='admin'` in every check so legacy dedicated admins & root keep
  full access. **Verify `has_cap()` returns true for root before switching
  policies; keep a tested rollback; apply off-peak** (a typo here blocks reads —
  see [[debug-stale-session]], but a real RLS error shows up, it's not the
  re-login case).

---

## 8. UI for assigning permissions (Account Management, needs `admins.manage`)
- "Make admin" → dialog: preset dropdown + a capability **matrix** (resources ×
  actions checkboxes + the area toggles). Save = `is_admin=true, permissions=[...]`.
- Existing admin row → "Edit permissions". Root / role-admin show "Full (super)"
  and are not editable.
- API: `setAdminPermissions(id, caps[])`, `demote(id)` = `{is_admin:false, permissions:'{}'}`.

---

## 9. Effort & phasing

| Phase | Scope | Security | Effort |
|---|---|---|---|
| **0** | migration: `permissions` + `deleted_at` cols + `has_cap()` | — | ~20 min (you apply) |
| **1** | frontend: SessionUser.permissions, `can()`, per-button/nav gating, permission-matrix dialog in Account Mgmt | UI-level | ~3–4 h |
| **2** | soft-delete: `deleted_at` filtering in all api lists, Trash view + restore + force-delete UI, soft/restore RPCs | feature | ~3–4 h |
| **3** | RLS: command-scoped per-cap policies + RPC cap checks + profiles guards | **DB-enforced** | ~2 h + careful test |

**Recommendation:** Phase 0 → 1 (limited admins, menus/buttons gated) → 2
(soft/force delete + trash) → 3 (make limits tamper-proof in the DB). Until
Phase 3, "limited" = UI boundary; Phase 3 makes it real.

---

## 10. Decisions — LOCKED (2026-06-08)
1. Soft-delete resources = **students, teachers, parents, questions** (NOT kpi_entries).
2. Force-delete = **only from Trash** (must soft-delete first).
3. Manage/limit admins = **super-admin (root) only** (`admins.manage` not granted to others by default).
4. Enforcement = **UI first (Phase 1), DB/RLS later (Phase 3)**. → promoted admins
   get full DB access via 0011's `is_admin`; the UI shows only their permitted
   areas. (Means 0011 must be applied.)
5. Presets + custom matrix.

### (original questions, for reference)
1. Confirm the **resource list** (students, teachers, parents, questions) and the
   **action set** (view/create/edit/soft_delete/force_delete/restore). Add any
   resource? (e.g. should `kpi_entries` get soft-delete too?)
2. **Force-delete**: allow it directly, or **only from Trash** (must soft-delete
   first)? (Recommend: only from Trash — safer.)
3. Who can grant/limit admins — **super-admin (root) only** (recommend) or any
   full admin?
4. Phasing: do all four phases now, or ship 0+1+2 and defer 3 (RLS) if all admins
   are trusted?
5. Presets in §3 ok, or different bundles?

Answer these and I'll start at Phase 0 (migration SQL) → Phase 1.
