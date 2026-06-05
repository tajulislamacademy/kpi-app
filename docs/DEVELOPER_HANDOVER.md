# শিক্ষার্থী KPI ম্যানেজমেন্ট সিস্টেম — Developer Handover Document

> **প্রতিষ্ঠান:** Tajul Islam Academy  
> **Live URL:** https://kpi.tajulislamacademy.com  
> **GitHub:** https://github.com/tajulislamacademy/kpi-app  
> **Supabase:** https://xskjbszzuwdxiybsvlox.supabase.co  
> **Hosting:** Vercel  

---

## ১. প্রজেক্ট পরিচিতি

একটি স্কুলের শিক্ষার্থী, শিক্ষক ও অভিভাবকদের মাসিক KPI (Key Performance Indicator) ট্র্যাক করার সিস্টেম। শিক্ষকরা প্রতিদিন/সাপ্তাহিক/মাসিক শিক্ষার্থীদের পয়েন্ট দেন, admin সেগুলো দেখেন, এবং রিপোর্টে র‌্যাংকিং তৈরি হয়।

**স্কুলের তথ্য:**
- শ্রেণী: Pre থেকে Class 10
- শিক্ষার্থী: ২০০+
- শিক্ষক: ১৫-২০ জন

---

## ২. টেকনোলজি স্ট্যাক

```
Frontend:   React 19 + Vite 8
Database:   Supabase (PostgreSQL) — এখনো সংযুক্ত হয়নি
Storage:    localStorage (সাময়িক)
Hosting:    Vercel (GitHub auto-deploy)
Language:   বাংলা + ইংরেজি (dual language)
CSS:        Inline styles (কোনো CSS framework নেই)
```

---

## ৩. প্রজেক্ট রান করার পদ্ধতি

```bash
# Clone করুন
git clone https://github.com/tajulislamacademy/kpi-app.git
cd kpi-app

# Dependencies install
npm install

# .env.local ফাইল তৈরি করুন
VITE_SUPABASE_URL=https://xskjbszzuwdxiybsvlox.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Development server
npm run dev

# Production build
npm run build
```

**Branch কাঠামো:**
- `development` — সব কাজ এখানে হয়
- `main` — Vercel এই branch থেকে deploy করে

---

## ৪. ফাইল কাঠামো

```
kpi-app/
├── src/
│   ├── App.jsx          ← পুরো অ্যাপ (সব component এক ফাইলে)
│   ├── main.jsx         ← Entry point
│   └── supabase.js      ← Supabase client (এখনো ব্যবহার হচ্ছে না)
├── public/
│   └── favicon.svg
├── index.html
├── package.json
└── vite.config.js
```

> **গুরুত্বপূর্ণ:** পুরো অ্যাপ `src/App.jsx` একটি ফাইলে লেখা। ফাইলটি বড় (~১০০০+ লাইন)। Supabase integration করার সময় component গুলো আলাদা ফাইলে ভাগ করা উচিত হবে।

---

## ৫. ব্যবহারকারীর ধরন ও অ্যাক্সেস

| ভূমিকা | Login ID | ডিফল্ট পাসওয়ার্ড | কী করতে পারে |
|--------|---------|-----------------|-------------|
| **Admin** | `admin` বা `ADM-YYYYXXXX` | `admin` বা সেট করা | সব কিছু |
| **শিক্ষক** | `TCH-YYYYXXXX` | `1234` | পয়েন্ট entry, নিজের KPI দেখা |
| **শিক্ষার্থী** | `STD-YYYYXXXX` | `1234` | শুধু নিজের KPI দেখা |
| **অভিভাবক** | `PAR-YYYYXXXX` | `1234` | সন্তানের KPI + নিজের KPI দেখা |

**ডেমো অ্যাকাউন্ট:**
```
admin / admin
TCH-20260001 / 1234
STD-20260001 / 1234
PAR-20260001 / 1234
```

---

## ৬. ডেটা কাঠামো (Data Structure)

এখন সব ডেটা `localStorage`-এ JSON হিসেবে সংরক্ষিত। Supabase-এ migrate করার সময় এই structure অনুসরণ করতে হবে।

### teachers (কি_tchr_q নামে নয়, kpi_teachers)
```js
{
  id: number,
  systemId: "TCH-20260001",
  name: "মোঃ রফিকুল ইসলাম",       // বাংলা নাম
  nameEn: "Md. Rafiqul Islam",      // ইংরেজি নাম
  password: "1234",                 // ⚠️ plain text
  classTeacher: { class: "8", section: "A" } | null,
  subjectAssignments: [
    { class: "6", section: "B", subject: "গণিত/Math" }
  ],
  guideStudents: [3, 4],            // student id array
  isAdmin: false                    // optional: true হলে admin access পাবে
}
```

### students (kpi_students)
```js
{
  id: number,
  systemId: "STD-20260001",
  name: "রাফি আহমেদ",
  nameEn: "Rafi Ahmed",
  class: "8",
  section: "A",
  roll: 1,
  password: "1234",                 // ⚠️ plain text
  isAdmin: false                    // optional
}
```

### parents (kpi_parents)
```js
{
  id: number,
  systemId: "PAR-20260001",
  name: "আহমেদ কবির",
  nameEn: "Ahmed Kabir",
  studentId: "STD-20260001",        // সন্তানের systemId দিয়ে লিঙ্ক
  relation: "father" | "mother" | "guardian",
  password: "1234",                 // ⚠️ plain text
  status: "pending" | "approved" | "rejected",
  isAdmin: false                    // optional
}
```

> একজন শিক্ষার্থীর সর্বোচ্চ ২ জন অভিভাবক থাকতে পারে।

### admins (kpi_admins)
```js
{
  id: number,
  systemId: "ADM-20260001",
  name: "অ্যাডমিন",
  nameEn: "Admin",
  password: "admin",                // ⚠️ plain text
  isRoot: true                      // true হলে delete করা যাবে না
}
```

### questions — শিক্ষার্থীর প্রশ্ন (kpi_questions)
```js
{
  id: number,
  textBn: "উপস্থিতি ও সময়মতো আসা",
  textEn: "Attendance & Punctuality",
  role: "classTeacher" | "subjectTeacher" | "guideTeacher",
  points: 10,                       // সর্বোচ্চ পয়েন্ট
  activeMonths: [0,1,2,...,11],     // কোন মাসে active (0=জানুয়ারি)
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
}
```

### Teacher ও Parent প্রশ্ন (kpi_tchrQ, kpi_parQ)
```js
{
  id: number,
  textBn: "সময়মতো উপস্থিতি ও পাঠদান",
  textEn: "Punctuality & Teaching",
  points: 10,
  activeMonths: [0,1,2,...,11],
  frequency: "monthly"
  // role ফিল্ড নেই — teacher/parent questions আলাদা array-এ থাকে
}
```

### entries — শিক্ষার্থীর পয়েন্ট (kpi_entries)
```js
{
  id: number,
  studentId: number,                // students.id
  teacherId: number,                // teachers.id
  date: "2026-01-15",
  questionId: number,               // questions.id
  questionText: "উপস্থিতি...",      // ✅ snapshot — প্রশ্ন delete হলেও থাকে
  questionTextEn: "Attendance...",
  maxPoints: 10,
  score: 9,
  month: 0,                         // 0-11
  year: 2026,
  role: "classTeacher" | "subjectTeacher" | "guideTeacher",
  subject: "গণিত/Math" | "",
  enteredBy: "teacher",
  editLog: [                        // admin edit করলে log থাকে
    { editedBy: "admin", editedAt: "2026-01-20", oldScore: 7, newScore: 9 }
  ]
}
```

### Teacher ও Parent Entries (kpi_tchrE, kpi_parE)
```js
{
  id: number,
  targetId: number,                 // teachers.id বা parents.id
  questionId: number,
  questionText: "...",
  questionTextEn: "...",
  maxPoints: 10,
  score: 8,
  month: 0,
  year: 2026,
  date: "2026-01-15",
  editLog: []
}
```

### termConfig (kpi_termConfig)
```js
{
  term1: [0, 1, 2],                 // মাসের index array (0=জানুয়ারি)
  term2: [3, 4, 5],
  term3: [6, 7, 8],
  term4: [9, 10, 11]
}
```

---

## ৭. KPI হিসাব পদ্ধতি

```
দৈনিক পয়েন্ট  = সেদিনের সব প্রশ্নের স্কোর যোগ
মাসিক KPI     = মাসের সব দিনের পয়েন্ট যোগ
প্রান্তিক KPI  = নির্দিষ্ট মাসগুলোর মাসিক KPI যোগ
বার্ষিক KPI   = ১২ মাসের মাসিক KPI যোগ
```

**Frequency enforcement:**
- `daily` → একই দিনে একই প্রশ্নে একবারের বেশি দেওয়া যাবে না
- `weekly` → একই সপ্তাহে একবার
- `monthly` → একই মাসে একবার
- `quarterly` → একই ত্রৈমাসিকে একবার
- `annual` → একই বছরে একবার

---

## ৮. Page Component তালিকা

| Component | কে দেখে | কাজ |
|-----------|---------|-----|
| `AuthPage` | সবাই | Login screen |
| `AdminTeacherDashboard` | Admin, Teacher | Dashboard stats ও ranking |
| `StudentDashboard` | Student | নিজের KPI chart |
| `ParentDashboard` | Parent | সন্তানের KPI |
| `TeachersPage` | Admin | শিক্ষক CRUD |
| `StudentsPage` | Admin | শিক্ষার্থী CRUD + অভিভাবক দেখা |
| `QuestionsPage` | Admin | প্রশ্ন CRUD (৩ ট্যাব) |
| `AccountsPage` | Admin | অভিভাবক approval + admin management |
| `PointEntryPage` | Admin, Teacher | শিক্ষার্থীদের KPI পয়েন্ট দেওয়া |
| `TeacherKPIPage` | Admin | শিক্ষকদের KPI পয়েন্ট দেওয়া |
| `ParentKPIPage` | Admin | অভিভাবকদের KPI পয়েন্ট দেওয়া |
| `MyTeacherKPIPage` | Teacher | শিক্ষকের নিজের KPI |
| `MyParentKPIPage` | Parent | অভিভাবকের নিজের KPI |
| `ReportsPage` | সবাই | Ranking ও রিপোর্ট |
| `SettingsPage` | Admin | প্রান্তিক configuration |
| `ProfilePage` | সবাই | Password পরিবর্তন |

---

## ৯. Shared Components

```js
useLocalStorage(key, initialValue)  // localStorage wrapper with React state
useIsMobile()                       // window.innerWidth < 768 detector
ConfirmDialog({lang, name, onConfirm, onCancel})  // Delete confirm modal
StatCard({icon, value, label, color})
RankCard({title, list, lang, t})
BarChart({data, cm})
YearSelector({t, lang, selectedYear, setSelectedYear, availableYears})
```

---

## ১০. Mobile Responsive কীভাবে কাজ করে

- `useIsMobile()` hook → window width < 768 হলে `true`
- Mobile-এ sidebar hidden → hamburger `☰` button → drawer slide in
- পয়েন্ট entry: Desktop = horizontal table, Mobile = vertical cards
- Padding ও font size responsive (`clamp()` CSS function ব্যবহার)

---

## ১১. Dual Language System

`T` object-এ `bn` ও `en` key-এ সব string আছে:

```js
const T = {
  bn: { appTitle: "শিক্ষার্থী KPI সিস্টেম", ... },
  en: { appTitle: "Student KPI System", ... }
}
```

`lang` state (`"bn"` বা `"en"`) দিয়ে সব জায়গায় `t = T[lang]` ব্যবহার হয়।

---

## ১২. এখন পর্যন্ত সম্পন্ন ফিচার

- [x] Login/Logout (session persist)
- [x] শিক্ষক, শিক্ষার্থী, অভিভাবক Add/Edit/Delete
- [x] Admin management (custom admin তৈরি, user→admin promote)
- [x] Student KPI — ৩ ধরনের শিক্ষক (শ্রেণী/বিষয়/গাইড)
- [x] Teacher KPI — আলাদা প্রশ্ন ও entry
- [x] Parent KPI — আলাদা প্রশ্ন ও entry
- [x] প্রশ্নমালা — ৩ ট্যাব, View/Edit/Delete/Add
- [x] প্রশ্নের frequency (দৈনিক/সাপ্তাহিক/মাসিক/ত্রৈমাসিক/বার্ষিক)
- [x] Frequency enforcement (নির্দিষ্ট period-এ একবারের বেশি দেওয়া যাবে না)
- [x] Admin যেকোনো entry edit করতে পারেন (edit log সহ)
- [x] প্রশ্ন delete হলেও পুরনো entry-তে প্রশ্নের text সংরক্ষিত
- [x] মাসিক/প্রান্তিক/বার্ষিক রিপোর্ট ও ranking
- [x] ৪টি প্রান্তিক custom মাস configuration
- [x] বছরভিত্তিক ফিল্টার
- [x] Mobile responsive (drawer nav, card-based entry)
- [x] বাংলা ও ইংরেজি dual language
- [x] localStorage persistence
- [x] Password change (profile page)

---

## ১৩. বাকি কাজ — Priority অনুযায়ী

### 🔴 Priority 1 — অবশ্যই করতে হবে

#### Supabase Database Integration
এটাই সবচেয়ে বড় কাজ। এখন সব ডেটা browser-এর localStorage-এ, যার মানে:
- ব্রাউজার clear করলে সব ডেটা যাবে
- একাধিক ডিভাইস থেকে একই ডেটা দেখা যাবে না
- Multiple user একসাথে কাজ করতে পারবে না

**করণীয়:**
1. Supabase-এ table তৈরি করুন (নিচের schema দেখুন)
2. `src/supabase.js` ইতিমধ্যে ready — শুধু `.env.local`-এ key বসান
3. `useLocalStorage` calls গুলো Supabase query দিয়ে replace করুন
4. Real-time subscription যোগ করুন

```sql
-- Suggested Supabase Tables
CREATE TABLE teachers (
  id SERIAL PRIMARY KEY,
  system_id TEXT UNIQUE,
  name TEXT,
  name_en TEXT,
  password TEXT,  -- production-এ hashed করতে হবে
  class_teacher JSONB,
  subject_assignments JSONB,
  guide_students INTEGER[],
  is_admin BOOLEAN DEFAULT false
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  system_id TEXT UNIQUE,
  name TEXT,
  name_en TEXT,
  class TEXT,
  section TEXT,
  roll INTEGER,
  password TEXT,
  is_admin BOOLEAN DEFAULT false
);

CREATE TABLE parents (
  id SERIAL PRIMARY KEY,
  system_id TEXT UNIQUE,
  name TEXT,
  name_en TEXT,
  student_id TEXT REFERENCES students(system_id),
  relation TEXT,
  password TEXT,
  status TEXT DEFAULT 'pending',
  is_admin BOOLEAN DEFAULT false
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  system_id TEXT UNIQUE,
  name TEXT,
  name_en TEXT,
  password TEXT,
  is_root BOOLEAN DEFAULT false
);

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  text_bn TEXT,
  text_en TEXT,
  role TEXT,  -- 'classTeacher' | 'subjectTeacher' | 'guideTeacher' | null
  target TEXT DEFAULT 'student',  -- 'student' | 'teacher' | 'parent'
  points INTEGER,
  active_months INTEGER[],
  frequency TEXT DEFAULT 'monthly'
);

CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  teacher_id INTEGER REFERENCES teachers(id),
  date DATE,
  question_id INTEGER REFERENCES questions(id),
  question_text TEXT,
  question_text_en TEXT,
  max_points INTEGER,
  score INTEGER,
  month INTEGER,
  year INTEGER,
  role TEXT,
  subject TEXT,
  entered_by TEXT,
  edit_log JSONB DEFAULT '[]'
);

CREATE TABLE teacher_entries (
  id SERIAL PRIMARY KEY,
  target_id INTEGER REFERENCES teachers(id),
  question_id INTEGER,
  question_text TEXT,
  question_text_en TEXT,
  max_points INTEGER,
  score INTEGER,
  month INTEGER,
  year INTEGER,
  date DATE,
  edit_log JSONB DEFAULT '[]'
);

CREATE TABLE parent_entries (
  id SERIAL PRIMARY KEY,
  target_id INTEGER REFERENCES parents(id),
  question_id INTEGER,
  question_text TEXT,
  question_text_en TEXT,
  max_points INTEGER,
  score INTEGER,
  month INTEGER,
  year INTEGER,
  date DATE,
  edit_log JSONB DEFAULT '[]'
);

CREATE TABLE term_config (
  id SERIAL PRIMARY KEY,
  term1 INTEGER[],
  term2 INTEGER[],
  term3 INTEGER[],
  term4 INTEGER[]
);
```

#### Password Hashing
এখন password plain text-এ সংরক্ষিত। Production-এ Supabase Auth বা bcrypt ব্যবহার করুন।

### 🟡 Priority 2 — গুরুত্বপূর্ণ

#### Code Splitting
`App.jsx` একটাই বড় ফাইল। Supabase integration করার আগে component গুলো আলাদা করুন:
```
src/
├── components/
│   ├── auth/AuthPage.jsx
│   ├── teachers/TeachersPage.jsx
│   ├── students/StudentsPage.jsx
│   └── ...
├── hooks/
│   ├── useLocalStorage.js
│   ├── useIsMobile.js
│   └── useKpiData.js
├── utils/
│   └── kpiCalculations.js
└── constants/
    └── translations.js
```

#### Supabase Row Level Security (RLS)
```sql
-- Teacher শুধু নিজের entry দেখতে পারবে
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
-- RLS policies যোগ করুন
```

### 🟢 Priority 3 — ভবিষ্যৎ

- [ ] Excel/PDF রিপোর্ট export
- [ ] Push notification (নতুন পয়েন্ট দিলে শিক্ষার্থী/অভিভাবক জানবে)
- [ ] Bulk student import (CSV থেকে)
- [ ] Print-friendly report view
- [ ] Attendance বিশেষ module

---

## ১৪. পরিচিত সমস্যা ও সীমাবদ্ধতা

| সমস্যা | বর্তমান অবস্থা | সমাধান |
|--------|----------------|--------|
| Password plain text | localStorage-এ | Supabase Auth বা bcrypt |
| Single browser data | localStorage | Supabase database |
| No server validation | Client-side only | Supabase RLS + backend |
| ID generation | `Date.now()` | Supabase serial/UUID |
| No image upload | নেই | Supabase Storage |

---

## ১৫. Environment Variables

```env
# .env.local ফাইলে রাখুন (git-এ commit করবেন না)
VITE_SUPABASE_URL=https://xskjbszzuwdxiybsvlox.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_****

# Vercel Dashboard > Project > Settings > Environment Variables-এ যোগ করুন
```

---

## ১৬. Deploy পদ্ধতি

```bash
# development branch-এ কাজ করুন
git checkout development
git add .
git commit -m "feature: ..."
git push origin development

# Vercel-এ deploy করতে main-এ merge করুন
git checkout main
git merge development
git push origin main
# Vercel স্বয়ংক্রিয়ভাবে deploy করবে
```

---

## ১৭. Supabase Dashboard

- URL: https://supabase.com/dashboard/project/xskjbszzuwdxiybsvlox
- এখন পর্যন্ত শুধু project তৈরি আছে, কোনো table নেই
- `src/supabase.js` ready — শুধু table তৈরি ও query integration বাকি

---

## ১৮. যোগাযোগ

- **GitHub:** tajulislamacademy
- **Project Owner:** Tajul Islam Academy

---

*Last updated: June 2026*
