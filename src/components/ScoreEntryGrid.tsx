import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import type { Dict, Lang, Person, Question } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  isMobile: boolean;
  targets: Person[];
  questions: Question[];
  getScore: (tid: string, qid: string) => number | string;
  setScore: (tid: string, qid: string, val: string) => void;
  getTotal: (tid: string) => number;
  isFreqDone: (tid: string, qid: string) => boolean;
  onSubmit: () => void;
  submitting: boolean;
  whoLabel: string;
  emptyMsg: string;
}

const DONE = "grid place-items-center rounded-lg bg-green-100 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300";

// Score-entry grid for a list of targets (teachers / parents) against a set of
// questions. Mobile = stacked cards, desktop = table. A frequency-completed
// cell shows ✓ instead of an input.
export function ScoreEntryGrid({ t, lang, isMobile, targets, questions, getScore, setScore, getTotal, isFreqDone, onSubmit, submitting, whoLabel, emptyMsg }: Props) {
  if (questions.length === 0) return <div className="py-8 text-center text-muted-foreground">{emptyMsg}</div>;
  const maxTotal = questions.reduce((s, q) => s + q.points, 0);
  const submitBtn = (full: boolean) => (
    <Button onClick={onSubmit} disabled={submitting} size={full ? "lg" : "default"} className={full ? "w-full" : undefined}>
      {submitting ? (lang === "bn" ? "জমা হচ্ছে…" : "Submitting…") : t.submitPoints}
    </Button>
  );
  if (isMobile) return (
    <div className="flex flex-col gap-3">
      {targets.map((tg) => (
        <Card key={tg.id}>
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
              <div><div className="text-sm font-bold text-foreground">{lang === "bn" ? tg.name : tg.nameEn}</div><div className="text-xs text-muted-foreground">{tg.systemId}</div></div>
              <div className="ml-2 shrink-0 text-right"><div className="text-2xl font-black leading-none tabular-nums text-foreground">{getTotal(tg.id)}</div><div className="text-xs text-muted-foreground">/{maxTotal} pts</div></div>
            </div>
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-0">
                <div className="mr-3 flex-1"><div className="text-sm font-medium text-foreground">{lang === "bn" ? q.textBn : q.textEn}</div><div className="text-xs text-muted-foreground">max {q.points}</div></div>
                {isFreqDone(tg.id, q.id) ? <div className={`${DONE} h-11 w-16`}>✓</div> : <Input type="number" min={0} max={q.points} className="h-11 w-16 text-center text-lg font-bold" value={getScore(tg.id, q.id)} onChange={(e) => setScore(tg.id, q.id, e.target.value)} placeholder="0" />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {submitBtn(true)}
    </div>
  );
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-35">{whoLabel}</TableHead>
            {questions.map((q) => (<TableHead key={q.id} className="min-w-20 text-center"><div className="text-xs font-semibold text-muted-foreground">{lang === "bn" ? q.textBn : q.textEn}</div><div className="text-xs text-foreground">/{q.points}</div></TableHead>))}
            <TableHead className="min-w-16 text-center">{lang === "bn" ? "মোট" : "Total"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((tg) => (
            <TableRow key={tg.id}>
              <TableCell><div className="text-sm font-semibold">{lang === "bn" ? tg.name : tg.nameEn}</div><div className="text-xs text-muted-foreground">{tg.systemId}</div></TableCell>
              {questions.map((q) => (<TableCell key={q.id} className="text-center">{isFreqDone(tg.id, q.id) ? <span className="text-xs font-semibold text-muted-foreground">✓</span> : <Input type="number" min={0} max={q.points} className="mx-auto h-9 w-14 text-center font-bold" value={getScore(tg.id, q.id)} onChange={(e) => setScore(tg.id, q.id, e.target.value)} placeholder="0" />}</TableCell>))}
              <TableCell className="text-center"><strong className="text-base tabular-nums text-foreground">{getTotal(tg.id)}</strong><div className="text-xs text-muted-foreground">/{maxTotal}</div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end p-4">{submitBtn(false)}</div>
    </Card>
  );
}
