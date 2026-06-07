# Tailwind + shadcn/ui Migration Plan

Migrate the KPI app's styling from centralized inline-style objects (`src/theme.ts` `S`)
to **Tailwind CSS v4 + shadcn/ui**, modernize the **sidebar/Layout**, and replace emoji
icons with **lucide-react**. Done gradually, one verifiable step at a time.

## Guiding principles

- **Incremental & non-breaking.** Inline `S` styles and Tailwind/shadcn coexist until a
  file is fully migrated. The app stays runnable after every commit.
- **Gate every step:** `npm run typecheck` + `npm run lint` + `npm test` + `npm run build`
  must all pass before commit.
- **Human visual check.** The assistant cannot see the rendered UI. After each page/area
  migrates, the user runs `npm run dev` and visually confirms before moving on.
- **Branch rule.** All work on `development`. The assistant never touches `main`; the user
  merges to `main` (Vercel auto-deploys) when ready.
- **Small commits**, one logical area each, so any step is easy to revert.

## Current state (as of this plan)

- Whole app is TypeScript (`.ts`/`.tsx`), lint + typecheck + 15 tests + build clean.
- Styling: every component uses `style={S.x}` from `src/theme.ts` (one big style object).
- Components hand-rolled in `src/components/` (Button-like buttons, Modal, Tabs, etc.).
- **Phase 0a DONE:** Tailwind v4 installed (`tailwindcss`, `@tailwindcss/vite`), Vite plugin
  wired, `@ -> src` path alias (vite + tsconfig), `@import "tailwindcss"` in `index.css`.

## Target structure additions

```
src/
  components/
    ui/            <- shadcn components live here (button.tsx, dialog.tsx, ...)
  lib/
    utils.ts       <- cn() helper (clsx + tailwind-merge)   [shadcn convention]
components.json    <- shadcn config (root)
```
Existing `src/components/*` (domain components) stay; they get rebuilt on top of `ui/`.

---

## Phase 0 — Foundation

- [x] **0a** Tailwind v4 + Vite plugin + `@` alias + `@import "tailwindcss"`.
- [ ] **0b** shadcn init: create `components.json`, `src/lib/utils.ts` (`cn`), and the
      design tokens (CSS variables for colors/radius) in `index.css` under `@theme`/`:root`.
      Pick a neutral base color (slate/zinc) close to the current palette (`#0f172a` ink).
- [ ] **0c** Install `lucide-react`. Smoke-add one shadcn `Button` to confirm wiring, then
      remove the smoke usage.

> Note: Tailwind v4 Preflight (CSS reset) is now active. It may subtly shift base element
> styles. Since the app uses explicit inline styles, impact should be small — verify on the
> first `dev` run and fix any base-style surprises in `index.css`.

---

## Phase 1 — UI primitives (shadcn) under `src/components/ui/`

Add shadcn components and re-implement our shared components on top of them. Map:

| Current (`S` / hand-rolled) | shadcn / Tailwind |
| --- | --- |
| `S.saveBtn` / `submitBtn` / `cancelBtn` / `addBtn`, loading-opacity pattern | `Button` (variants: default / secondary / destructive / outline; `disabled`) |
| `S.inp` (text/number/date) | `Input` |
| native `<select>` | `Select` |
| `Modal` (backdrop+box) | `Dialog` |
| `ConfirmDialog` | `AlertDialog` |
| `Tabs` (pill row) | `Tabs` |
| `S.table` / `tableWrap` | `Table` |
| `S.card` | `Card` |
| `StatCard` | `Card` composition |
| status pills (approved/pending/rejected) / role tags | `Badge` |
| `ErrorNote` | `Alert` (destructive) |
| checkboxes (teacher guide/class) | `Checkbox` + `Label` |
| `YearSelector` | `Select` |
| `MonthsPicker` | `ToggleGroup` (multiple) or styled buttons |

Each primitive: add via shadcn, rewrite our wrapper to use it (keep the same props API so
pages don't change yet), gate, commit. Keep our domain components' external props stable to
avoid touching pages in this phase.

---

## Phase 2 — Layout / sidebar modernization (+ lucide)

Rebuild `src/components/Layout.tsx` with Tailwind + shadcn + lucide:

- Modern sidebar: clean spacing, active-item highlight, hover states, section grouping,
  collapsible on desktop (optional), smooth mobile drawer (shadcn `Sheet` for the mobile nav).
- Replace the language two/one-button with a clean toggle (shadcn `Button`/`Switch`).
- User block at the bottom with avatar + role badge; `Button` (outline) for logout.
- Notification toast → shadcn `Sonner` (toast) or keep a simple Tailwind toast.

**Nav emoji → lucide icons:**

| key | emoji | lucide |
| --- | --- | --- |
| dashboard | ⬛ | `LayoutDashboard` |
| pointEntry | ✏️ | `ClipboardPen` |
| teachers | 👨‍🏫 | `Users` |
| students | 🎓 | `GraduationCap` |
| questions | 📋 | `ListChecks` |
| accounts | 👤 | `UserCog` |
| reports | 📊 | `BarChart3` |
| teacherKpi | 📊 | `Award` |
| parentKpi | 👥 | `UsersRound` |
| settings | ⚙️ | `Settings` |
| myTchrKpi / myParKpi | 📈 | `TrendingUp` |
| profile | 🔑 | `KeyRound` |

**Action emoji → lucide:** edit `Pencil`, delete `Trash2`, view `Eye`, add `Plus`,
approve `Check`, reject `X`, logout `LogOut`, menu `Menu`, reset `RotateCcw`.

`navItems` in `App.tsx`: change `icon` from emoji string to a lucide component reference.

---

## Phase 3 — Pages, one at a time (S inline → Tailwind + shadcn)

Order (simple → complex), each: migrate, gate, user `dev`-verifies, commit.

1. `Auth` (login) — small, high visibility.
2. `Profile`
3. `Settings`
4. `Dashboards` (Admin / Student / Parent)
5. `Reports`
6. `Accounts`
7. `Questions`
8. `Students`
9. `Teachers`
10. `KPI` (Teacher / Parent / self pages)
11. `PointEntry` (largest, role-aware grid)

For each page: remove `style={S.x}` usages, use Tailwind utility classes + shadcn
components, keep behavior identical (logic untouched). Re-run the gate; user dev-checks the
page in both Bengali and English and on mobile width.

---

## Phase 4 — Cleanup

- [ ] Remove now-unused entries from `src/theme.ts`; delete `theme.ts` once `S` is fully gone.
- [ ] Remove leftover `index.css` rules superseded by Tailwind (keep Bengali font setup).
- [ ] Final full gate + a complete role-by-role smoke test on `dev`.
- [ ] Update `MEMORY.md` / progress notes.

---

## Risks & mitigations

- **Look shifts during coexistence (Preflight / partial migration):** expected; user
  verifies per step, we fix as we go. Never migrate two pages before verifying the first.
- **Bengali font / readability:** keep `'Noto Sans Bengali'` in the font stack via Tailwind
  `@theme`/base so Bengali text stays crisp.
- **Can't visually verify (assistant):** every UI step ends with a user `dev` check before
  proceeding — non-negotiable.
- **shadcn registry needs network:** `shadcn add` fetches components; if offline, add the
  component source manually from the shadcn docs.
- **Scope creep:** stick to the page order; don't redesign behavior, only presentation.

## Definition of done

All pages use Tailwind + shadcn, sidebar modernized with lucide icons, `theme.ts` `S`
removed, gate green, user has visually approved every screen, and the branch is ready for
the user to merge to `main`.
