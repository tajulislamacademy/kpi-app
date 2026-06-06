# Supabase Setup — Students Slice (Phase 1, Auth Option B)

Goal: stand up the first real tables (`profiles`, `students`) with RLS, and one
admin login, so the app can read/write students from the database instead of
localStorage. No Supabase CLI required — everything runs from the dashboard.

> Project: `xskjbszzuwdxiybsvlox` · Auth model: **Option B (Supabase Auth)**
> Security: anon key is public by design; **RLS is the real guard** — already in the migration.
 
---
 
## Step 1 — Run the schema migration

1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/migrations/0001_students_slice.sql`](../supabase/migrations/0001_students_slice.sql).
3. **Run**. Expect: `Success. No rows returned.`

This creates `profiles` + `students`, the `my_role()` helper, and enables RLS with policies.

## Step 2 — Seed the demo data

1. SQL Editor → New query.
2. Paste [`supabase/seed.sql`](../supabase/seed.sql) → **Run**.
3. Verify: `select system_id, role, name_en from profiles;` → 1 admin + 6 students.

## Step 3 — Create the admin login & link it

The seeded admin row has no login yet. Attach a real auth account:

1. Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Email: `admin@kpi.local`  (synthetic — we log in by system_id, mapped to this)
   - Password: choose a strong one (this replaces the old `admin/admin`).
   - ✅ **Auto Confirm User** (so no email step).
2. Copy the new user's **UID** (User UID column).
3. SQL Editor → run, pasting that UID:
   ```sql
   update public.profiles
   set auth_id = 'PASTE-AUTH-USER-UID-HERE'
   where system_id = 'ADM-20260001';
   ```

Now `admin@kpi.local` is the root admin; `my_role()` returns `admin` for them, so
RLS grants full access to `profiles` and `students`.

## Step 4 — Confirm env is wired

`.env.local` (gitignored) must hold the **anon / publishable** key — never the service_role key:
```
VITE_SUPABASE_URL=https://xskjbszzuwdxiybsvlox.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_********
```
Same two vars in **Vercel → Settings → Environment Variables**, then redeploy.

## Step 5 — Quick RLS sanity check (optional but recommended)

In SQL Editor (runs as service role, bypasses RLS) you'll see all rows. To test RLS
as the admin, use the app after Step 6, or the dashboard's **API Docs → auth** examples.
A correct setup means: anon (logged-out) reads return **0 rows** from `students`.

---

## What comes next (code-wiring — next session)

Once Steps 1–4 are green:
1. Add `@tanstack/react-query` + `QueryClientProvider`.
2. `AuthContext`: `signInWithPassword({ email: systemIdToEmail(id), password })`,
   load the matching `profiles` row, expose `{ session, profile, role }`.
3. `src/api/students.js`: `listStudents`, `addStudent`, `updateStudent`, `deleteStudent`
   via `supabase.from('students')` joined to `profiles`.
4. Swap `StudentsPage` from the `kpi_students` localStorage store to these hooks.
5. Verify two browsers share data → slice proven → repeat pattern for teachers, etc.

### system_id → email mapping (for Step in code)
We keep the familiar `STD-20260001` login by mapping to a synthetic email:
`STD-20260001` → `std-20260001@kpi.local` (lowercase, `@kpi.local`). Admin uses
`admin@kpi.local`. This is an internal convention; real email is not required.
