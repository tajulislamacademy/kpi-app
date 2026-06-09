# Database Schema — source of truth (reflects migrations 0001–0022)

This is a hand-maintained snapshot of the live Postgres/Supabase schema after all
migrations. The numbered files in `supabase/migrations/` remain the executable
record; this doc is the at-a-glance reference so you don't have to replay 22 files
in your head. **Update it whenever you add a migration.**

To regenerate authoritatively from a live DB: `supabase db dump --schema public`.

---

## Enums

- `user_role` — `admin | teacher | student | parent`

## Tables

### `profiles` — shared identity for every person
| column | type | notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| auth_id | uuid UNIQUE → auth.users ON DELETE SET NULL | null = no login yet |
| system_id | text UNIQUE NOT NULL | `TCH-/STD-/PAR-/ADM-YYYYNNNN` |
| role | user_role NOT NULL | |
| name | text NOT NULL | Bengali |
| name_en | text | |
| is_root | boolean NOT NULL default false | the un-removable super admin |
| is_admin | boolean (0011) | promoted limited admin |
| permissions | text[] (0012) | capability keys a limited admin holds |
| created_at | timestamptz default now() | |

### `students` — 1:1 with a `role='student'` profile
| column | type | notes |
|---|---|---|
| id | uuid PK → profiles ON DELETE CASCADE | |
| class | text NOT NULL | |
| section | text | |
| roll | int | |
| deleted_at | timestamptz (0012) | soft-delete / Trash |

### `teachers` — 1:1 with a `role='teacher'` profile
| column | type | notes |
|---|---|---|
| id | uuid PK → profiles ON DELETE CASCADE | |
| class_teacher | jsonb | `{class, section}` or null |
| subject_assignments | jsonb NOT NULL default `[]` | `[{class, section, subject}]` |
| guide_students | uuid[] NOT NULL default `{}` | student profile ids (no FK — scrubbed by trigger 0022) |
| deleted_at | timestamptz (0012) | |

### `parents` — 1:1 with a `role='parent'` profile
| column | type | notes |
|---|---|---|
| id | uuid PK → profiles ON DELETE CASCADE | |
| student_id | uuid → students ON DELETE SET NULL | the child |
| relation | text | father / mother / guardian |
| status | text NOT NULL default 'pending' | pending / approved / rejected (gates login) |
| deleted_at | timestamptz (0012) | |

### `questions` — all three categories in one table
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| category | text NOT NULL | student / teacher / parent |
| role | text | classTeacher/subjectTeacher/guideTeacher (student only) |
| text_bn | text NOT NULL | |
| text_en | text | |
| points | int NOT NULL default 0 | |
| frequency | text NOT NULL default 'monthly' | daily/weekly/monthly/quarterly/annual |
| active_months | int[] NOT NULL default `{0..11}` | |
| deleted_at | timestamptz (0012) | archived question (snapshot keeps its points in reports) |
| created_at | timestamptz default now() | |

### `term_config` — single row (id=1)
`term1..term4 int[]` — which month indexes (0–11) belong to each term.

### `kpi_entries` — every student/teacher/parent score
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| target_type | text | student / teacher / parent |
| target_id | uuid → profiles ON DELETE CASCADE | who the points are about |
| entered_by | uuid → profiles ON DELETE SET NULL | who entered them |
| question_id | uuid → questions ON DELETE SET NULL | null once question force-deleted |
| question_text / question_text_en | text | **snapshot** — survives question deletion |
| max_points | int | snapshot |
| score | int | `CHECK 0 ≤ score ≤ max_points` (0017, NOT VALID) |
| role | text | student entries: which teacher role |
| subject | text | |
| month | int (0–11) / year | int |
| entry_date | date | |
| edit_log | jsonb | append-only audit of edits |
| created_at | timestamptz | |

- UNIQUE index `kpi_entries_no_dup (target_id, question_id, entry_date)` (0010, made non-partial in 0019 so upsert `ON CONFLICT` works).

---

## Functions (all SECURITY DEFINER unless noted)

| function | purpose |
|---|---|
| `my_role()` | role of the current `auth.uid()` (no profiles-RLS recursion) |
| `my_profile_id()` | profile id of the current auth user |
| `is_admin_user()` | `role='admin' OR is_admin` |
| `has_cap(cap text)` | `is_root OR role='admin' OR (is_admin AND cap = any(permissions))` |
| `teacher_can_target_student(uuid)` (0017) | true iff the student is in the caller-teacher's guide_students / class-teacher class+section / a subject_assignment |
| `admin_set_password(uuid, text)` (0018) | requires `accounts.manage`; refuses resetting root unless caller is root |
| `student_month_totals()` (0021) | aggregate per-student monthly sums for rankings (replaces the 0020 definer view; authenticated-only) |
| `protect_root_admin()` | trigger fn — see below |
| `scrub_deleted_student_refs()` | trigger fn — see below |

## Triggers

- `trg_protect_root_admin` — BEFORE INSERT **and** UPDATE on `profiles` (0013 + 0016). Keeps root a full admin; blocks creating/changing privileged accounts (`is_admin`/`permissions`/`role`/`is_root`) without `has_cap('admins.manage')`.
- `trg_scrub_student` — BEFORE DELETE on `students` (0022). Removes the id from every `teachers.guide_students` array.

---

## RLS (effective policy summary)

- **profiles** — broad: admins read/write (`is_admin_user()`); a teacher/student can read profiles (roster). Privilege escalation blocked by `trg_protect_root_admin`.
- **students / teachers / parents / questions** — per-command policies (0013): `my_role()='admin' OR has_cap('<resource>.<action>')`. Roster reads are broad (any authenticated) so rankings can show names.
- **kpi_entries** —
  - admin: all (`my_role()='admin' OR has_cap('point_entry')`).
  - owner read: `target_id = my_profile_id()`; parent read: own child's student rows (0008).
  - teacher: insert/update **only their own students** (0017); read their students' raw rows (0020) and their students' parents' rows (0019).
  - capability access for limited admins: `teacher_kpi` → teacher-target rows, `parent_kpi` → parent-target rows (0015).
  - **No broad raw read** — the 0009 "any authenticated reads student entries" policy was dropped in 0020. Cross-cohort visibility is aggregate-only via `student_month_totals()`.
- **term_config** — `my_role()='admin' OR has_cap('settings.edit')`.

> Privacy model: raw per-question scores are visible only to admin / the person / their parent / their teacher. Everyone else sees only aggregate monthly totals (names + sums) for rankings.
