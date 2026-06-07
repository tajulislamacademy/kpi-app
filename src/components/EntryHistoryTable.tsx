import { Pencil } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import type { Dict, Lang, Person, TargetEntry } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  entries: TargetEntry[];
  people: Person[];
  whoLabel: string;
  onEdit: (e: TargetEntry) => void;
}

// Recent KPI entries (newest first, capped at 50) with an edit button per row.
// people = the target list (teachers/parents); whoLabel = that column's header.
export function EntryHistoryTable({ t, lang, entries, people, whoLabel, onEdit }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader><CardTitle className="text-base">{t.entryHistory}</CardTitle></CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
              <TableHead>{whoLabel}</TableHead>
              <TableHead>{lang === "bn" ? "প্রশ্ন" : "Question"}</TableHead>
              <TableHead>{t.points}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...entries].reverse().slice(0, 50).map((e) => {
              const who = people.find((x) => x.id === e.targetId);
              const edited = (e.editLog || []).length > 0;
              return (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{e.date}</TableCell>
                  <TableCell>{lang === "bn" ? who?.name : who?.nameEn}</TableCell>
                  <TableCell><div className="max-w-xs whitespace-normal text-sm">{lang === "bn" ? e.questionText : e.questionTextEn}</div></TableCell>
                  <TableCell className="tabular-nums">{edited ? <span><span className="mr-1 text-xs text-muted-foreground line-through">{e.editLog[0].oldScore}</span><strong className="text-foreground">{e.score}</strong></span> : <strong className="text-foreground">{e.score}</strong>}</TableCell>
                  <TableCell><Button size="icon" variant="outline" className="h-8 w-8" aria-label={t.edit} onClick={() => onEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
