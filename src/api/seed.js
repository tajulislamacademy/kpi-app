// Dev-only demo-data seeding. Reuses the real create APIs (so it exercises the
// same provisioning path production uses) instead of raw SQL. Idempotent-ish:
// skips questions/teachers if they already exist. Students are seeded via SQL
// (supabase/seed.sql) and are login-less, which is fine for point-entry tests.
import { listQuestions, createQuestion } from "./questions";
import { listTeachers, createTeacher } from "./teachers";
import { listStudents } from "./students";

const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const DEMO_QUESTIONS = [
  { category: "student", role: "classTeacher", textBn: "উপস্থিতি ও সময়মতো আসা", textEn: "Attendance & Punctuality", points: 10, frequency: "daily", activeMonths: ALL },
  { category: "student", role: "classTeacher", textBn: "শ্রেণীকক্ষে শৃঙ্খলা", textEn: "Classroom Discipline", points: 10, frequency: "daily", activeMonths: ALL },
  { category: "student", role: "subjectTeacher", textBn: "পাঠে মনোযোগ", textEn: "Attention in Class", points: 10, frequency: "daily", activeMonths: ALL },
  { category: "student", role: "subjectTeacher", textBn: "হোমওয়ার্ক সম্পন্ন করা", textEn: "Homework Completion", points: 10, frequency: "weekly", activeMonths: ALL },
  { category: "student", role: "guideTeacher", textBn: "নৈতিক আচরণ ও মূল্যবোধ", textEn: "Moral Behavior & Values", points: 15, frequency: "weekly", activeMonths: ALL },
  { category: "teacher", role: null, textBn: "সময়মতো উপস্থিতি ও পাঠদান", textEn: "Punctuality & Teaching", points: 10, frequency: "monthly", activeMonths: ALL },
  { category: "parent", role: null, textBn: "অভিভাবক সভায় উপস্থিতি", textEn: "Parent Meeting Attendance", points: 10, frequency: "monthly", activeMonths: ALL },
];

export async function seedDemoData(log = () => {}) {
  // --- Questions (create only the ones missing, matched by category+role+text) ---
  const existingQ = await listQuestions();
  const has = (q) => existingQ.some((e) => e.category === q.category && (e.role || null) === (q.role || null) && e.textBn === q.textBn);
  let created = 0;
  for (const q of DEMO_QUESTIONS) {
    if (!has(q)) { await createQuestion(q); created++; }
  }
  log(created ? `${created} questions created` : "all demo questions already present — skipped");

  // --- Teachers (with logins, password 123456) ---
  const existingT = await listTeachers();
  if (existingT.length < 2) {
    const students = await listStudents();
    const guide = students.slice(0, 2).map((s) => s.id);
    const yr = new Date().getFullYear();
    const maxSeq = existingT.reduce((m, tc) => {
      const n = parseInt(String(tc.systemId || "").split("-")[1]?.slice(4)) || 0;
      return Math.max(m, n);
    }, 0);
    const mk = (seq) => `TCH-${yr}${String(seq).padStart(4, "0")}`;
    await createTeacher({
      systemId: mk(maxSeq + 1), name: "রফিক স্যার", nameEn: "Rafiq Sir", password: "123456",
      classTeacher: { class: "8", section: "A" },
      subjectAssignments: [{ class: "8", section: "A", subject: "গণিত/Math" }],
      guideStudents: guide,
    });
    await createTeacher({
      systemId: mk(maxSeq + 2), name: "সুমাইয়া ম্যাডাম", nameEn: "Sumaiya Madam", password: "123456",
      classTeacher: null,
      subjectAssignments: [
        { class: "8", section: "A", subject: "বাংলা/Bangla" },
        { class: "8", section: "A", subject: "ইংরেজি/English" },
      ],
      guideStudents: [],
    });
    log("2 teachers created (password 123456)");
  } else {
    log(`teachers already exist (${existingT.length}) — skipped`);
  }
  log("✓ seed done");
}
