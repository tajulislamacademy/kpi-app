# KPI App — UI/UX & Frontend Audit

**Author:** Claude (acting senior UI/UX designer + frontend engineer)
**Date:** 2026-06-07
**Scope:** Whole app after the Tailwind + shadcn migration (all 11 pages, shared
components, `ui/` primitives, theme tokens). Reviewed on light + dark, desktop +
mobile widths.
**Stack:** React 19 · Vite · TypeScript · Tailwind v4 · shadcn/ui (new-york) ·
radix-ui · lucide-react.

---

## 1. Executive summary

The migration is structurally complete and correct — tokens, dark mode, and
component composition are solid. What's missing is **polish and density tuning**:
the app currently looks like *default shadcn dropped into existing markup*, not a
*designed product*. The four issues you raised are all real and are symptoms of
three root causes:

1. **No shared layout primitives.** Every page re-implements its own container,
   header, table-in-card, and spacing by hand → inconsistent max-widths, padding,
   and rhythm.
2. **Double padding on tables.** Tables sit inside `CardContent` (`px-6`) *and*
   carry their own cell padding → wide side gutters; two-line cells make rows
   tall.
3. **Wrong primitive for long lists.** Native radix `Select` is not searchable;
   Teacher/Student pickers with dozens of entries are painful.

None of this is hard to fix. Below is a prioritized plan. Estimated total: ~1.5–2
focused sessions for P0+P1.

### Severity legend
- 🔴 **P0** — hurts daily usability or looks visibly unfinished. Fix first.
- 🟠 **P1** — noticeable polish / consistency gap.
- 🟡 **P2** — nice-to-have refinement.

---

## 2. Findings

### A. Tables — padding, density, card-wrapping 🔴

**Where:** `Reports`, `Accounts`, `Questions`, `Students`, `Teachers`, `PointEntry`
(entry list + score grid), `EntryHistoryTable`, `ScoreEntryGrid`.

**Problems**
- `ui/table.tsx`: `TableCell` = `p-2`, `TableHead` = `h-10 px-2`. Fine alone — but
  every table is wrapped in `<Card><CardContent className="pt-6">`, and
  `CardContent` is `px-6` (24px). Net horizontal inset before content = **24 + 8 =
  32px each side**, and on mobile that eats the viewport. This is the "দুই পাশে
  প্যাডিং বেশি" you saw.
- `pt-6` on the wrapper adds a tall gap above the header row.
- Two-line cells (name + systemId, name + class) + `p-2` make rows ~56px tall →
  feels loose ("উপর-নিচে প্যাডিং বেশি").
- Header style is plain; no visual separation from body (no muted bg / uppercase).
- `whitespace-nowrap` on every cell is correct for scroll but makes long question
  text never wrap even when there's room.

**Fix (canonical shadcn "table in card" pattern)**
- Render tables **flush** to the card: `CardContent` → `px-0`, and let cells own
  the gutter. Or drop the Card wrapper and use a bordered table container.
- Cell padding: `px-4 py-2.5` for comfortable, or `px-3 py-2` for dense (KPI app
  is data-dense → go dense). First/last cell `px-4` so content isn't glued to the
  border.
- Header: `h-9`, `text-xs font-medium uppercase tracking-wide text-muted-foreground`,
  `bg-muted/50`, sticky-ready.
- Collapse two-line cells: keep primary text, move the secondary id into a
  `text-muted-foreground` inline after it, or a tooltip — saves vertical space.
- Allow the long "Question" column to wrap (`whitespace-normal max-w-xs`).
- Add **zebra-free** rows (shadcn uses hover + border only) — already good; keep.

> Recommend a single `DataTable` wrapper component so all tables share density,
> header style, empty state, and the scroll container. See §5.

---

### B. Searchable Select → Combobox 🔴

**Where:** every `Select` with a long/unbounded option list:
- `PointEntry` filters — **Teacher** and **Student** dropdowns (dozens of rows).
- `Accounts` — Student-ID entry (currently a free-text Input + manual lookup; a
  searchable student Combobox is far better).
- `Teachers` — **Guide students** (multi-select checkboxes in a scroll box — works
  but a searchable multi-combobox is cleaner at scale).
- Bounded lists (class, section, relation, frequency, month, role, status) are
  fine as plain `Select` — **do not** over-convert these.

**Problem:** radix `Select` (`ui/select.tsx`) has no type-to-filter. With 50+
students you scroll forever.

**Fix:** add shadcn **Combobox** = `Popover` + `Command` (cmdk). Build two
reusable wrappers:
- `<Combobox>` — single-select, searchable (Teacher/Student filters, Student-ID).
- `<MultiCombobox>` — multi-select with chips (Guide students).

Requires adding `command` + `popover` primitives (`npx shadcn add command popover`)
— they pull in `cmdk`. Snippet in §5.

---

### C. Responsiveness 🔴 / 🟠

**Problems**
- 🔴 **Inconsistent page widths:** `Profile` max-w-2xl, `Settings` 3xl, `Reports`/
  `Accounts`/`Questions` 5xl, `Dashboards`/`Students`/`Teachers`/`KPI`/`PointEntry`
  6xl. No system → pages feel like different apps. Pick a scale: **content/data
  pages = `max-w-6xl`**, **single-column forms = `max-w-2xl`**, centered.
- 🔴 **Wide tables on mobile:** Students (8 cols), Teachers, PointEntry entry-list
  only get horizontal scroll. The scroll works, but the *first column doesn't
  stick*, so you lose the name while scrolling. Add `sticky left-0 bg-card` to the
  first cell/head, or provide a mobile card layout (as `ScoreEntryGrid` already
  does — good pattern, extend it).
- 🟠 **Form grids:** `sm:grid-cols-2` jumps straight from 1→2; fine, but the
  PointEntry filter grid `grid-cols-2 ... lg:grid-cols-6` makes 6 tiny selects on
  large screens — cap at `lg:grid-cols-4` or use a filter bar that wraps.
- 🟠 **Touch targets:** icon buttons are `h-8 w-8` (32px) — below the 44px mobile
  guideline. Bump to `h-9 w-9` on touch, or `size="icon"` (36px) minimum.
- 🟠 **Header rows** (`flex flex-wrap justify-between`) stack awkwardly on small
  screens (title + YearSelector). Verify the YearSelector goes full-width or wraps
  cleanly < 380px.

---

### D. Spacing, layout system & vertical rhythm 🟠

**Problems**
- Page padding varies (`p-4 sm:p-6`) but is re-typed per page; section gaps use
  `space-y-4` somewhere, manual `mb-*` elsewhere.
- `Card` default is `py-6 gap-6` — generous; for data cards it's too airy and
  contributes to the "loose" feel. Introduce a **compact card** variant for tables/
  filters (`py-4 gap-4`).
- No spacing scale doc → ad-hoc values.

**Fix:** A `<Page>` shell + `<PageHeader>` (rebuilt) component that standardizes
container width, padding, title/subtitle/action, and a `space-y-6` body. See §5.

---

### E. Iconography — emoji everywhere 🟠

**Where:** `StatCard` icons (🎓👨‍🏫✏️🏆), tab/section labels, status text
(✅❌⏳), buttons (✅ Approve, 🗑️), empty/alert prefixes (⚠️🌱🔍📈📅).

**Problem:** emoji render inconsistently across OS/browser, don't inherit color,
break alignment, and read as unfinished. A pro dashboard uses a single icon set.

**Fix:** replace with **lucide** (already a dep): `GraduationCap`, `Users`,
`ClipboardPen`, `Trophy`, `CheckCircle2`, `XCircle`, `Clock`, `TrendingUp`,
`CalendarDays`, `Search`, `Sprout`, `AlertTriangle`. Keep medals (🥇🥈🥉) — those
are intentional and read fine. Give `StatCard` an `icon: LucideIcon` prop with a
tinted icon chip.

---

### F. Typography & hierarchy 🟠

- Page titles vary: `text-xl sm:text-2xl` (most) — good, standardize everywhere.
- Card titles `text-base` vs default `leading-none font-semibold` — inconsistent.
- Bengali (Noto Sans Bengali) + numerals: confirm line-height is comfortable;
  Bengali needs slightly more `leading` than Latin. Consider `leading-relaxed` on
  long Bengali body text.
- No `tabular-nums` on KPI numbers → score columns misalign. Add `tabular-nums` to
  numeric cells and StatCard values.

---

### G. Component polish 🟠 / 🟡

- 🟠 **Tabs** (`components/Tabs.tsx`, custom pill) — inconsistent with shadcn look.
  Either restyle to a proper segmented control or adopt shadcn `Tabs`. Reports +
  PointEntry + Accounts + Questions all use it; one consistent style matters.
- 🟠 **Toasts:** `showNotif` still renders the old `S.notif` fixed div. `sonner`
  is already installed (came with shadcn). Replace with `<Toaster />` + `toast()`
  for stacking, auto-dismiss, variants (success/error).
- 🟠 **Empty states:** plain centered text. Add an `<EmptyState icon title hint>`
  component (muted icon + message) — used in PointEntry, Accounts, tables.
- 🟡 **Loading:** data loads show nothing/`…`. Add shadcn `Skeleton` rows for
  tables and stat cards on first load.
- 🟡 **EditScoreModal / Modal:** `EditScoreModal` + `ConfirmDialog` still use the
  custom `Modal`. Migrate to shadcn `Dialog` / `AlertDialog` for consistent
  animation, focus-trap, and ESC/overlay behavior. (`ConfirmDialog` → `AlertDialog`
  is the textbook fit.)
- 🟡 **PageHeader** component is now unused (pages inline headers) — delete or
  rebuild as the standard header (§5) and reuse.

---

### H. Forms & inputs 🟠

- Inputs are unlabeled-for-screenreaders in a few spots (Label without `htmlFor`/
  `id` pairing — Profile/Auth pair them, others rely on proximity). Pair `Label
  htmlFor` ↔ `Input id` everywhere.
- Number inputs (scores) show spinner arrows; consider `[appearance:textfield]` +
  centered, or stepper buttons for touch.
- Validation: errors are plain red `<p>`; fine. Consider inline field-level error
  state via `aria-invalid` (shadcn styles it) instead of a single message.
- The Student-ID "✅ name / ❌" inline check is good UX — keep, but swap emoji for
  lucide `Check`/`X` and tie into the Combobox from §B.

---

### I. Color, contrast & dark-mode polish 🟡

- Status/role badges now have explicit dark variants — good. Audit contrast: e.g.
  `bg-amber-100 text-amber-700` on light passes; verify `dark:bg-amber-950
  dark:text-amber-300` ≥ 4.5:1.
- `bg-muted/40` child cards (Parent dashboard) are very subtle in dark — bump to
  `/50`–`/60` or add a border for definition.
- Sidebar is permanently dark slate in both themes (intentional, approved) — but in
  **light** mode the dark sidebar + light content has a hard seam. Consider a 1px
  border or subtle shadow on the content side. Optional.
- Progress bar gradient `from-primary to-muted-foreground` in dark mode → primary
  is near-white; verify the bar still reads as a "fill". Consider a fixed accent.

---

### J. Accessibility 🟠

- Icon-only buttons (edit/delete/view) need `aria-label` (only `PasswordInput` has
  one). Add to every `size="icon"` button.
- Color-only status (badges) — fine since they have text labels. Keep text.
- Focus-visible rings come from shadcn — good. Verify the dark sidebar nav items
  show a visible focus ring.
- Dialog/AlertDialog give focus-trap for free once `Modal` is migrated (§G).
- Tables: add `<caption className="sr-only">` or `aria-label` per table.

---

### K. Micro-interactions / motion 🟡

- Buttons have `transition-all` (good). Cards/rows: add subtle `hover:bg-muted/50`
  (rows already do). 
- Dialog/Select have radix animations — good.
- Consider a 150ms ease on theme toggle (`color-scheme` switch flashes).
- Tab change / list updates: no transition. Optional `animate-in fade-in`.

---

## 3. Prioritized remediation plan

### P0 — do first (functional + most visible)
1. **`DataTable` wrapper** + fix table density/padding (flush-in-card, `px-3 py-2`,
   muted header, sticky first col, numeric `tabular-nums`). → §A
2. **Combobox + MultiCombobox** (add `command`+`popover`); wire Teacher/Student
   filters, Accounts student picker, Teacher guide-students. → §B
3. **Standardize page shell**: `<Page>` + `<PageHeader>`; unify max-widths
   (data=6xl, form=2xl) + padding + `space-y-6`. → §C/§D

### P1 — polish pass
4. Emoji → lucide across StatCard, tabs, status, buttons, alerts. → §E
5. `sonner` toasts replace `S.notif`. → §G
6. `EmptyState` + `Skeleton` components; wire into tables/stat cards. → §G
7. `ConfirmDialog`→`AlertDialog`, `EditScoreModal`→`Dialog`; delete `Modal`. → §G
8. `aria-label` on all icon buttons; `htmlFor`/`id` pairing. → §J/§H
9. Compact `Card` variant for data/filter cards; consistent CardTitle. → §D/§F

### P2 — refinement
10. Mobile card layouts for the widest tables (extend ScoreEntryGrid pattern).
11. Tabs → restyled segmented control / shadcn Tabs.
12. Motion polish, sidebar seam, dark-mode contrast nits.
13. Delete unused `theme.ts` `S` keys once components are fully Tailwind; add
    global `body { @apply bg-background text-foreground }` base layer.

---

## 4. Proposed conventions (to lock in)

| Concern | Decision |
|---|---|
| Page container | `mx-auto w-full max-w-6xl px-4 py-6 sm:px-6` (data) · `max-w-2xl` (forms) |
| Section spacing | `space-y-6` page body; `space-y-4` within a card |
| Table cell | `px-3 py-2` (dense), first/last `px-4`, header `h-9` muted uppercase |
| Card (data) | compact: `py-4`, `CardContent px-0` for tables / `px-4` for forms |
| Numbers | `tabular-nums` on all KPI/score/total cells |
| Icons | lucide only (keep 🥇🥈🥉 medals); `size-4` default, `size-3.5` in buttons |
| Long lists | Combobox (searchable); short bounded lists keep `Select` |
| Toasts | `sonner` |
| Touch target | ≥ `h-9 w-9` (36px) icon buttons |

---

## 5. Reference snippets

### Searchable single-select Combobox
```tsx
// components/Combobox.tsx
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Opt { value: string; label: string }
export function Combobox({ options, value, onChange, placeholder = "Select…", searchPlaceholder = "Search…", className }: {
  options: Opt[]; value: string; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal", className)}>
          <span className={cn("truncate", !sel && "text-muted-foreground")}>{sel?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### DataTable wrapper (consistent density + flush-in-card)
```tsx
// usage: tables become edge-to-edge, dense, with a styled header
<Card className="py-0 overflow-hidden">           {/* compact, no vertical pad */}
  <Table>
    <TableHeader className="bg-muted/50">
      <TableRow>
        <TableHead className="h-9 px-4 text-xs uppercase tracking-wide">…</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="px-4 py-2 tabular-nums">…</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</Card>
```
Better: bake `px-4 py-2` + header style into the `ui/table.tsx` primitives so
every table inherits it (one edit, app-wide). Override per-table only when needed.

### Standard page shell
```tsx
// components/Page.tsx
export function Page({ children, width = "data" }: { children: React.ReactNode; width?: "data" | "form" }) {
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 space-y-6", width === "form" ? "max-w-2xl" : "max-w-6xl")}>{children}</div>;
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
```

### Sticky first column (mobile wide tables)
```tsx
<TableHead className="sticky left-0 z-10 bg-muted/50">Name</TableHead>
<TableCell className="sticky left-0 z-10 bg-card">…</TableCell>
```

### Toasts (sonner)
```tsx
// main.tsx: <Toaster richColors position="top-right" />
// replace showNotif(msg) → toast.success(msg) / toast.error(msg)
```

---

## 6. What I recommend next

Start with **P0** in this order: (1) bake table density into `ui/table.tsx` +
flush-in-card — instantly fixes the padding complaint app-wide; (2) add Combobox
and wire the Teacher/Student pickers — fixes "not searchable"; (3) `Page`/
`PageHeader` shell — unifies responsiveness and widths. Each ships behind the
standard gate (typecheck + lint + build + tests) and a dev-verify, one step at a
time, nothing breaking — same cadence as Phase 3.

---

## 7. Additional findings — code-level deep sweep (2026-06-07)

Found by grepping the whole `src/` after the visual audit. Concrete, with
file:line. These complement §2 (some are net-new).

### Functional / correctness
- 🟠 **`ui/sonner.tsx` ↔ theme mismatch.** `components/ui/sonner.tsx:10` imports
  `useTheme` from **next-themes**, but the app uses a *custom* `ThemeProvider`
  (`components/theme-provider.tsx`) — there is no next-themes provider mounted.
  The moment we wire toasts (`<Toaster/>`), `useTheme()` returns `undefined` →
  toasts won't follow light/dark. **Fix when wiring sonner:** patch `sonner.tsx`
  to import our `useTheme` (from `../theme-provider`), or adopt next-themes as the
  real provider. `next-themes` (`package.json`) is otherwise an unused dependency.
- 🟡 **Index-as-key in a mutable list.** `PointEntry.tsx:201` `<TableRow key={i}>`
  for the filtered entry list — entries have stable `e.id`. Index keys can
  mis-associate rows when filters change (affects the edit button target). Use
  `key={e.id}`. (Teachers assignment Badges `key={i}/{j}` and editLog `key={i}`
  are append-only/stable → acceptable.)
- 🟡 **Hardcoded year fallback.** `e.year || 2026` (`api/entries.ts`) silently
  labels any row missing `year` as 2026 → mislabels legacy data once we're past
  2026. Derive a default or store year on write for all rows.

### Dark-mode polish (semantic boxes not theme-aware)
- 🟠 These render a **light** background in dark mode (jarring), because they use
  inline hex instead of dark-aware classes:
  - `ErrorNote.tsx:9` — red load-error bar (`#fee2e2/#991b1b/#fca5a5`). Shows on
    every data-load failure → bright red bar on dark. Convert to
    `bg-destructive/10 text-destructive border-destructive/30` (or red `*-950`).
  - `ErrorBoundary.tsx:25` — error `<pre>` box (`#fee2e2/#991b1b`).
  - `EditScoreModal.tsx:23` — amber edit-history box (`#fef3c7/#92400e/#78350f`).
  - `ScoreEntryGrid.tsx:39` — green ✓ "done" chip (`#f0fdf4/#166534`). (Note:
    PointEntry's inline grid already got dark variants; the shared `ScoreEntryGrid`
    used by the KPI pages did not — inconsistent.)
  - `RankCard.tsx:13` / `Reports.tsx:43` — medal tints (acceptable, but verify).

### Accessibility
- 🟠 **Label↔input not associated.** ~37 `<Label>` across pages, only **5**
  `htmlFor`. Most form fields rely on visual proximity only → clicking the label
  doesn't focus, screenreaders don't announce the field. Pair `Label htmlFor` ↔
  `Input id` (Auth/Profile already do; Accounts/Students/Teachers/Questions/KPI/
  PointEntry/Reports don't).
- 🟠 **7 icon-only buttons** (`size="icon"`) lack `aria-label` (edit/delete/view/
  approve/reject across pages). Add labels.
- 🟡 **`index.html` `lang="en"`** but the UI is Bengali-first → set `lang="bn"`
  (or sync to the language toggle). Also add `<meta name="description">`. Title is
  fine.

### Maintainability / dead code
- 🟡 **`PageHeader.tsx` is dead** — no importers after Phase 3 (pages inline their
  headers). Delete, or rebuild as the standard `PageHeader` from §5 and reuse.
- 🟡 **`nextSystemId` duplicated verbatim** in `Accounts.tsx:37`, `Students.tsx:32`,
  `Teachers.tsx:37`. Extract `nextSystemId(prefix, rows)` to `lib.ts`.
- 🟡 **12 components still import `theme.ts` `S`** (Tabs, MonthsPicker, StatCard,
  RankCard, TermBreakdown, EditScoreModal, EntryHistoryTable, ScoreEntryGrid,
  ConfirmDialog, ErrorBoundary, Modal, PageHeader). They're tokenized (work in
  dark), but full Tailwind conversion lets us **delete `theme.ts`** and add the
  global `body { @apply bg-background text-foreground }` base layer. (P2)
- 🟡 **`Tabs` + `MonthsPicker`** are custom S-based controls. `Tabs` (used on
  Reports/Accounts/Questions/PointEntry) is visually inconsistent with shadcn —
  promote to a shadcn-style segmented control. `MonthsPicker` is fine; just
  Tailwind-ize.
- 🟡 **8× `eslint-disable react-hooks/set-state-in-effect`** in `api/*` data hooks
  + `Settings.tsx:25`. Legitimate (syncing fetched/prop data) but undocumented;
  add a one-line "why" or refactor the config hook to derive instead of effect.

### Verified clean ✅
- No `console.log` (only `ErrorBoundary` `console.error` — intended).
- No `TODO/FIXME/HACK`, no `@ts-ignore`/`@ts-expect-error`.
- No `<img>` without `alt` (no raster images).
- No `SelectItem value=""` (would crash radix).
- `.env` gitignored; no secrets in `src`.

### Updated priority deltas
Fold into the §3 plan:
- Add to **P1**: ErrorNote/ErrorBoundary/EditScoreModal/ScoreEntryGrid dark-aware
  fix; `sonner.tsx` theme patch (do alongside toast wiring); Label/`htmlFor`
  pairing; `index.html` `lang="bn"`.
- Add to **P2**: delete `PageHeader`; extract `nextSystemId` to `lib`; `key={e.id}`
  in PointEntry; Tabs→segmented; finish `theme.ts` removal + base layer.
