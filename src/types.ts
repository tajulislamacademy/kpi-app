// Shared domain types — the UI-facing shapes the api/ layer returns (camelCase),
// distinct from the snake_case Supabase rows. Raw rows stay `any` (no generated
// DB types); these describe what flows through the app.

export type Lang = "bn" | "en";
// The active-language string table (T[lang]); keys accessed as t.save etc.
export type Dict = Record<string, string>;

export type Role = "admin" | "teacher" | "student" | "parent";
export type QuestionCategory = "student" | "teacher" | "parent";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type ParentStatus = "pending" | "approved" | "rejected";

// Identity fields shared by every person (from a profiles row).
export interface Person {
  id: string;
  systemId?: string;
  name?: string;
  nameEn?: string;
  authId?: string | null;
}

export interface Student extends Person {
  class?: string;
  section?: string | null;
  roll?: number | null;
}

export interface ClassTeacher { class: string; section: string; }
export interface SubjectAssignment { class: string; section: string; subject: string; }

export interface Teacher extends Person {
  classTeacher?: ClassTeacher | null;
  subjectAssignments: SubjectAssignment[];
  guideStudents: string[];
}

export interface Parent extends Person {
  studentId?: string | null;
  relation: string;
  status: ParentStatus;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  role: string | null;
  textBn: string;
  textEn: string;
  points: number;
  frequency: Frequency;
  activeMonths: number[];
}

export interface EditLogEntry { editedBy?: string; editedAt: string; oldScore: number; newScore: number; }

// Student point-entry (studentKpiHelpers key off studentId).
export interface StudentEntry {
  id: string;
  studentId: string;
  teacherId?: string | null;
  date: string;
  questionId: string | null;
  questionText?: string;
  questionTextEn?: string;
  maxPoints?: number;
  score: number;
  month: number;
  year: number;
  role?: string | null;
  subject?: string | null;
  editLog: EditLogEntry[];
}

// Teacher/parent KPI entry (targetKpiHelpers key off targetId).
export interface TargetEntry {
  id: string;
  targetId: string;
  date: string;
  questionId: string | null;
  questionText?: string;
  questionTextEn?: string;
  maxPoints?: number;
  score: number;
  month: number;
  year: number;
  editLog: EditLogEntry[];
}

export interface TermConfig { term1: number[]; term2: number[]; term3: number[]; term4: number[]; }

// The in-app logged-in user (built in pages/Auth.jsx loadSessionUser).
export interface SessionUser extends Person {
  role: Role;
  isRoot?: boolean;
  isAdmin?: boolean;
  backend?: boolean;
  classTeacher?: ClassTeacher | null;
  subjectAssignments?: SubjectAssignment[];
  guideStudents?: string[];
  class?: string;
  section?: string | null;
  roll?: number | null;
  studentId?: string | null;
  relation?: string;
  status?: ParentStatus;
}

// --- create/update payloads (camelCase, from admin forms) -------------------
export interface StudentInput { systemId: string; name: string; nameEn?: string; cls: string; section?: string | null; roll?: number | null; password?: string | null; }
export interface StudentUpdate { name: string; nameEn?: string; cls: string; section?: string | null; roll?: number | null; password?: string | null; authId?: string | null; systemId?: string; }
export interface TeacherInput { systemId: string; name: string; nameEn?: string; password?: string | null; classTeacher?: ClassTeacher | null; subjectAssignments?: SubjectAssignment[]; guideStudents?: string[]; }
export interface TeacherUpdate { name: string; nameEn?: string; classTeacher?: ClassTeacher | null; subjectAssignments?: SubjectAssignment[]; guideStudents?: string[]; password?: string | null; authId?: string | null; systemId?: string; }
export interface QuestionInput { category: QuestionCategory; role: string | null; textBn: string; textEn: string; points: number; frequency: Frequency; activeMonths: number[]; }
export interface ParentInput { systemId: string; name: string; nameEn?: string; password?: string | null; studentId?: string | null; relation: string; status?: ParentStatus; }
export interface ParentUpdate { name: string; nameEn?: string; relation: string; status: ParentStatus; studentId?: string | null; password?: string | null; authId?: string | null; systemId?: string; }
