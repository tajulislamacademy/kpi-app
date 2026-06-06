# KPI App — Audit Report & Refactor Plan

> Prepared: 2026-06-05 · Auditor: Opus 4.8 · Scope: full codebase (`src/App.jsx`, `src/supabase.js`, config)
> Status: **Functional prototype. NOT production-ready.**
> Reconciled against `docs/DEVELOPER_HANDOVER.md` + live deployment facts (see Part 0).

---

## Part 0 — Live Facts & Reconciliation (read first)

Verified against the owner's handover doc and the current repo state:

- **Live:** https://kpi.tajulislamacademy.com (Vercel, auto-deploys from `main`).
- **Scale:** ~200+ students, 15–20 teachers, Pre–Class 10. Small dataset → either SERIAL or UUID PKs perform fine; the choice is driven by the auth model below, not by scale.
- **Supabase project already exists** (`xskjbszzuwdxiybsvlox.supabase.co`) but has **no tables yet**. So Phase 1 = "create schema", not "create project".
- **Env key format is the new one:** `VITE_SUPABASE_ANON_KEY=sb_publishable_****` (not the legacy `eyJ...` JWT). Both are valid anon keys; new projects issue `sb_publishable_`.
- **Env convention is `.env.local`**, which `.gitignore` already covers via `*.local`. Secret-leak risk is therefore low **as long as the bare `.env` filename is avoided** — Phase 0 still hardens this.
- **`frequency` now exists** on every question (`daily|weekly|monthly|quarterly|annual`) with client-side rate enforcement. The schema (Part 4) and migration must carry it. This feature post-dates the first audit pass.

### The one decision that reshapes the plan — Auth model

The current data keeps `password` columns and integer IDs. Two valid paths:

| | **Option A — Custom auth (keep shape)** | **Option B — Supabase Auth (recommended)** |
|---|---|---|
| User tables | SERIAL int PK + hashed `password` column | UUID PK = `auth.users.id`, no password column |
| Login by `TCH-2026…` | query table, compare hash | map system_id → synthetic email, `signInWithPassword` |
| Migration size | Smaller; 1:1 with current data | Larger; introduces auth + email mapping |
| RLS quality | Weaker — `auth.uid()` not available, policies hard | Strong — policies key off `auth.uid()` |
| Sessions / reset | Hand-rolled | Built-in (JWT, refresh, password reset) |

**DECISION (locked 2026-06-05): Option B — Supabase Auth.** Chosen by owner. The schema in Part 4
applies as-is. Consequences now binding on the plan:

- **anon key is public by design.** It ships in the Vite bundle (any `VITE_` var does) and is already
  visible on the live site via DevTools. This is expected — security comes from **RLS, not secrecy**.
  Therefore **every table MUST have RLS enabled before it holds real data** (Phase 1, non-negotiable).
- **`service_role` / secret key must NEVER appear in `.env`, any `VITE_` var, or frontend code.**
  It belongs only in Supabase Edge Function secrets (server-side). Admin-only writes (create user,
  approve parent) route through an Edge Function using that key — never the browser.
- Secret hygiene: real values live in `.env.local` / `.env` (both gitignored); `.env.example` holds
  placeholders only; Vercel env stores the anon key only.

---

## Part 1 — Executive Summary

The app is a bilingual (BN/EN), mobile-responsive school KPI system with four roles
(Admin, Teacher, Student, Parent) and a well-designed scoring model. The **domain logic is sound**.

However, it is a **single-device prototype**, not a deployable product. The root problem:

| Claimed | Reality |
|---|---|
| Uses Supabase (PostgreSQL backend) | `supabase.js` creates a client that is **never imported anywhere**. All data lives in browser `localStorage`. |
| Multi-user school system | Each browser has its own isolated copy of all data. Two teachers can never see each other's entries. |
| Secure auth | Passwords stored & compared as **plain text** in `localStorage`. Demo credentials printed in the login UI. |

**Verdict:** Before any new feature work, the app must move from `localStorage` to a real backend
with proper auth. Everything else (modularization, TypeScript, performance) is secondary but
should ride along with that migration.

---

## Part 2 — Detailed Findings

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

### 2.1 Architecture & Data

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| A1 | 🔴 | Supabase client is dead code; all state in `localStorage` | `grep supabase src/App.jsx` → 0 matches |
| A2 | 🔴 | No shared/server data — system cannot work multi-user | every `useState` seeded from `localStorage` |
| A3 | 🟠 | Entire app is one 1021-line file, ~16 components | `src/App.jsx` |
| A4 | 🟠 | No backend schema, no migrations, no data validation layer | — |
| A5 | 🟡 | Inline `<style>` global injection + one giant `S` style object | `App.jsx:280`, `S` at `:960` |

### 2.2 Security

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| S1 | 🔴 | Passwords stored as plain text | `initStudents`/`initTeachers` `password:"1234"`; `x.password===form.password` at `:294` |
| S2 | 🔴 | Auth & role checks are 100% client-side — trivially bypassable via DevTools | `AuthPage.doLogin` `:290`, `isAdmin` derived client-side `:212` |
| S3 | 🟠 | Live demo credentials rendered in login page | `:325-326` |
| S4 | 🟠 | Account passwords displayed in plain text in Accounts/Teacher/Student tables | `:516-517`, `:523` |
| S5 | 🟠 | No Row Level Security — once on Supabase, any user could read all rows without policies | (future risk) |
| S6 | 🟡 | `.gitignore` ignores `*.local` but **not** `.env`; no `.env.example` | `.gitignore` |

### 2.3 React Correctness

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| R1 | 🔴 | `genId` uses `array.length+1` as sequence → deleting a record causes **duplicate systemId** on next add | `:586`, `:643`, `genId` `:111` |
| R2 | 🟠 | IDs generated as `Date.now()+Math.random()` (float) → collision & non-stable keys | `:758`, `:869`, `:901` |
| R3 | 🟠 | List `key={i}` (array index) on mutable, reversed/filtered lists → wrong row reconciliation | `:826`, `:889`, `:921` |
| R4 | 🟠 | Hardcoded `(e.year||2026)` fallback → in 2027 all legacy rows mis-bucket into 2026 | `:191,194,197,767,768` |
| R5 | 🟡 | IIFE rendered inside JSX — unreadable, untestable | `:772` |
| R6 | 🟡 | `useIsMobile()` called in 4 components → 4 duplicate `resize` listeners | `:208,737,861,892` |

### 2.4 React Performance

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| P1 | 🟠 | Zero `useMemo`/`useCallback`/`React.memo` in the codebase | `grep` → 0 matches |
| P2 | 🟠 | 9 KPI helper functions recreated every render & passed as props → cascade re-renders | `:191-199` |
| P3 | 🟡 | `[...students].map().sort()` recomputed every render across dashboards/reports | `:333,334,363,836` |
| P4 | 🟡 | Heavy prop drilling — `t`, `lang` threaded manually into every component | throughout |

### 2.5 Tooling & Quality

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| Q1 | 🟠 | No TypeScript / PropTypes — no type safety on a data-heavy app | `package.json` |
| Q2 | 🟡 | No tests of any kind | repo |
| Q3 | 🟡 | No `ErrorBoundary` — one component throw blanks the whole app | `grep` → 0 |
| Q4 | 🟡 | README is the unmodified Vite starter template | `README.md` |
| Q5 | ⚪ | `vite.config.js` empty — no path aliases, no build tuning | `vite.config.js` |
| Q6 | ⚪ | i18n is a hand-rolled dictionary; scales poorly, no pluralization/interpolation | `T` `:15` |

### 2.6 What's actually good (keep it)

- Clean, deliberate KPI domain model: class/subject/guide teacher roles, term config, multi-year.
- Entries embed `questionText` so deleted questions still render in history — thoughtful.
- Genuine mobile responsiveness (card vs table), drawer nav, `clamp()` typography.
- Edit audit trail (`editLog`) on score edits.
- Consistent, restrained visual design.

---

## Part 3 — Target Architecture

```
React (Vite) ── TanStack Query ──▶ Supabase JS SDK ──▶ Postgres + RLS
     │                                      │
     ├─ Context: Auth, Language             ├─ Supabase Auth (sessions, hashed pw)
     └─ Feature-sliced components           └─ Edge Functions (admin-only user creation)
```

**Key decisions**

1. **Backend = Supabase Postgres.** Replace every `useLocalStorage` data store with DB tables.
2. **Auth = Supabase Auth.** Login keeps the familiar `TCH-20260001` ID by mapping each system ID
   to a synthetic email (`tch-20260001@kpi.local`) behind the scenes; passwords become hashed by
   Supabase. No plain-text passwords anywhere.
3. **Authorization = RLS policies**, enforced in the database, not the client.
4. **Server state = TanStack Query** (`@tanstack/react-query`). Client/UI state stays in React.
5. **Type safety = TypeScript**, with types generated from the Supabase schema (`supabase gen types`).
6. **Structure = feature-sliced files**, replacing the monolith.

---

## Part 4 — Proposed Database Schema

```sql
-- Roles enum
create type user_role as enum ('admin','teacher','student','parent');
create type parent_status as enum ('pending','approved','rejected');
create type kpi_role as enum ('classTeacher','subjectTeacher','guideTeacher');

-- One row per login identity, id = auth.users.id
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  system_id   text unique not null,          -- TCH-20260001, STD-..., PAR-..., ADM-...
  role        user_role not null,
  name        text not null,
  name_en     text,
  is_root     boolean default false,
  created_at  timestamptz default now()
);

create table students (
  id        uuid primary key references profiles(id) on delete cascade,
  class     text not null,
  section   text,
  roll      int
);

create table teachers (
  id            uuid primary key references profiles(id) on delete cascade,
  class_teacher jsonb            -- { class, section } | null
);
create table teacher_subjects (
  teacher_id uuid references teachers(id) on delete cascade,
  class text, section text, subject text
);
create table teacher_guides (
  teacher_id uuid references teachers(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  primary key (teacher_id, student_id)
);

create table parents (
  id         uuid primary key references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  relation   text,                            -- father | mother | guardian
  status     parent_status default 'pending'
);

-- Questions: category replaces the 3 separate arrays
create table questions (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,                 -- 'student' | 'teacher' | 'parent'
  role         kpi_role,                      -- only for category='student'
  text_bn      text not null,
  text_en      text,
  points       int not null,
  frequency    text not null default 'monthly', -- daily|weekly|monthly|quarterly|annual
  active_months int[] not null               -- 0..11
);
-- NOTE: `frequency` drives entry-rate enforcement (one entry per question per
-- period). Currently enforced client-side (weekDoneCheck etc.). On migration this
-- check must move to a DB constraint / unique index or an RPC to be tamper-proof,
-- e.g. a partial unique index on (target_id, question_id, period_key).

-- Unified KPI entries (student/teacher/parent via target_type)
create table kpi_entries (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null,               -- 'student' | 'teacher' | 'parent'
  target_id     uuid not null,
  entered_by    uuid references profiles(id),
  question_id   uuid references questions(id),
  question_text text, question_text_en text,  -- snapshot, keep on delete
  max_points    int,
  score         int not null,
  role          kpi_role,                     -- for student entries
  subject       text,
  month         int not null, year int not null,
  entry_date    date not null,
  edit_log      jsonb default '[]',
  created_at    timestamptz default now()
);

create table term_config (
  id     int primary key default 1,
  term1  int[], term2 int[], term3 int[], term4 int[]
);
```

**RLS policy sketch**

- `profiles`: a user can `select` their own row; admins can select all.
- `students`/`kpi_entries`: admins full; teachers may read students they teach/guide and write
  entries for them; students read only their own; parents read only their child's.
- `questions`/`term_config`: read = any authenticated; write = admin only.
- All policies key off a `role()` SQL helper that reads `profiles.role` for `auth.uid()`.

---

## Part 5 — Phased Execution Plan

Each phase is independently shippable and leaves the app working.

### Phase 0 — Safety net & hygiene (½ day) 🔴
- [ ] Use `.env.local` (already gitignored via `*.local`); also add the bare `.env` to `.gitignore` as belt-and-suspenders; create `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] Add a top-level `ErrorBoundary` around `<App/>`.
- [ ] Remove demo credentials block from the login screen (or gate behind `import.meta.env.DEV`).
- [ ] Stop rendering plain-text passwords in admin tables.
- [ ] README already superseded by `docs/DEVELOPER_HANDOVER.md`; trim the stale Vite-template README or point it at the handover.

### Phase 1 — Backend foundation (1–2 days) 🔴
- [ ] Supabase project exists (`xskjbszzuwdxiybsvlox`) — **create the schema**: commit SQL migrations for Part 4 (incl. `questions.frequency`).
- [ ] Enable RLS on every table; add the policies in Part 4 (assumes Auth Option B).
- [ ] Seed reference data (term_config defaults, sample questions w/ frequency) via migration.
- [ ] Add a tamper-proof rate-limit (partial unique index or RPC) for question `frequency`.
- [ ] `supabase gen types typescript` → `src/types/db.ts`.

### Phase 2 — Auth migration (1–2 days) 🔴 — assumes Option B (see Part 0)
- [ ] Confirm anon key (`sb_publishable_…`) is set in `.env.local` and in Vercel env (redeploy after).
- [ ] Wire `supabase.auth` — login by system_id→synthetic-email mapping, `signOut`, `onAuthStateChange`.
- [ ] Build `AuthContext` (session, profile, role) replacing the `kpi_currentUser` localStorage user.
- [ ] Admin "create user" flows go through a Supabase **Edge Function** (service role) that creates
      the `auth` user + `profiles` row atomically and hashes the password. No client-side user inserts.
- [ ] Parent self-registration writes `status='pending'`; approval flips status (admin only via RLS).

### Phase 3 — Data layer (2–3 days) 🔴
- [ ] Add `@tanstack/react-query`; wrap app in `QueryClientProvider`.
- [ ] Write a thin `src/api/*` module per entity (students, teachers, parents, questions, entries, term).
- [ ] Replace each `useLocalStorage(...)` with the matching query/mutation hook.
- [ ] Delete `useLocalStorage` once no data store depends on it (keep only for UI prefs like `lang`).
- [ ] Verify: two browsers, two users, shared data, real-time refetch on mutation.

### Phase 4 — Frontend modularization (2–3 days) 🟠
Target structure:
```
src/
  api/            students.ts, teachers.ts, entries.ts, ...
  components/     common UI (StatCard, RankCard, BarChart, ConfirmDialog, YearSelector)
  features/
    auth/         AuthPage, AuthContext
    dashboard/    Admin/Student/Parent dashboards
    teachers/ students/ questions/ accounts/ reports/ settings/ point-entry/
  i18n/           strings + LanguageContext + useT()
  styles/         theme.ts (the S object, split by domain)
  lib/            supabase.ts, ids.ts
  App.tsx  main.tsx
```
- [ ] Extract components file-by-file; no behavior change per commit.
- [ ] Introduce `LanguageContext` + `useT()` to kill `t`/`lang` prop drilling.

### Phase 5 — TypeScript + correctness fixes (2 days) 🟠
- [ ] Convert `.jsx`→`.tsx`; adopt generated DB types end-to-end.
- [ ] Fix R1 (sequence IDs): derive `system_id` from a DB sequence/`max+1` server-side, never `array.length`.
- [ ] Fix R2: all client IDs via `crypto.randomUUID()` (or let Postgres `gen_random_uuid()` own it).
- [ ] Fix R3: stable `key` = row UUID, never array index.
- [ ] Fix R4: make `year` non-null at write time; drop the `||2026` fallbacks.
- [ ] Replace the JSX IIFE (R5) with a real component.

### Phase 6 — Performance & polish (1–2 days) 🟡
- [ ] `useMemo` for ranked/sorted lists; `useCallback` for shared helpers; `React.memo` on heavy rows.
- [ ] Single `useIsMobile` at the top, delivered via context.
- [ ] Add path aliases in `vite.config` + `tsconfig`.
- [ ] Add Vitest + React Testing Library; cover KPI aggregation math and auth guards first.
- [ ] (Optional) adopt a real i18n lib (e.g. `i18next`) if string volume grows.

**Rough total: ~12–17 working days** for a single dev, fully sequenced. Phases 0–3 are the
non-negotiable core; 4–6 raise it to professional standard.

---

## Part 6 — Risk & Sequencing Notes

- **Do not** start Phase 4 (file split) before Phase 3 (data layer). Splitting the monolith while
  data access is still changing doubles the churn. Backend first, restructure second.
- Keep each phase on its own branch off `development`; the app must boot & log in after every phase.
- Migrate one entity end-to-end (e.g. students) through Phases 1→3 as a vertical slice to validate
  the pattern before fanning out to the rest.
- Back up current `localStorage` seed data → SQL seed so the demo dataset survives the migration.
```
```
