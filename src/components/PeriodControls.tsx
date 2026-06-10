import { useMemo } from "react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { DatePicker } from "./DatePicker";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Dict, Lang } from "../types";

// Frequency filter + a period control whose shape follows the frequency:
// daily/weekly/all → date picker; monthly → month+year; quarterly → quarter+year;
// annual → year. Shared by PointEntry, TeacherKPI and ParentKPI entry pages.
const FREQS = ["daily", "weekly", "monthly", "quarterly", "annual"];
const QUARTERS = [
  { bn: "১ম ত্রৈমাসিক (জানু–মার্চ)", en: "Q1 (Jan–Mar)" },
  { bn: "২য় ত্রৈমাসিক (এপ্রিল–জুন)", en: "Q2 (Apr–Jun)" },
  { bn: "৩য় ত্রৈমাসিক (জুলাই–সেপ্ট)", en: "Q3 (Jul–Sep)" },
  { bn: "৪র্থ ত্রৈমাসিক (অক্টো–ডিসে)", en: "Q4 (Oct–Dec)" },
];
const pad = (n: number) => String(n).padStart(2, "0");

interface Props { t: Dict; lang: Lang; freqFilter: string; setFreqFilter: (f: string) => void; selectedDate: string; setSelectedDate: (d: string) => void; }

export function PeriodControls({ t, lang, freqFilter, setFreqFilter, selectedDate, setSelectedDate }: Props) {
  const cm = new Date(selectedDate).getMonth(), cy = new Date(selectedDate).getFullYear();
  const nowY = new Date().getFullYear();
  const yearOpts = useMemo(() => Array.from(new Set([nowY + 1, nowY, nowY - 1, nowY - 2, cy])).sort((a, b) => b - a), [nowY, cy]);
  const freqLabel = (f: string) => (({ daily: t.daily, weekly: t.weekly, monthly: t.monthly, quarterly: t.quarterly, annual: t.annual } as Record<string, string>)[f] || f);
  const yearSel = (onChange: (y: number) => void) => (
    <Select value={String(cy)} onValueChange={y => onChange(parseInt(y))}>
      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>{yearOpts.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>{lang === "bn" ? "ফ্রিকোয়েন্সি" : "Frequency"}</Label>
        <Select value={freqFilter} onValueChange={setFreqFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lang === "bn" ? "সব" : "All"}</SelectItem>
            {FREQS.map(f => <SelectItem key={f} value={f}>{freqLabel(f)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {freqFilter === "monthly" ? (<>
        <div className="space-y-1.5"><Label>{t.month}</Label>
          <Select value={String(cm)} onValueChange={v => setSelectedDate(`${cy}-${pad(parseInt(v) + 1)}-01`)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{T[lang][m]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>{lang === "bn" ? "বছর" : "Year"}</Label>{yearSel(y => setSelectedDate(`${y}-${pad(cm + 1)}-01`))}</div>
      </>) : freqFilter === "quarterly" ? (<>
        <div className="space-y-1.5"><Label>{lang === "bn" ? "ত্রৈমাসিক" : "Quarter"}</Label>
          <Select value={String(Math.floor(cm / 3))} onValueChange={q => setSelectedDate(`${cy}-${pad(parseInt(q) * 3 + 1)}-01`)}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{QUARTERS.map((q, i) => <SelectItem key={i} value={String(i)}>{lang === "bn" ? q.bn : q.en}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>{lang === "bn" ? "বছর" : "Year"}</Label>{yearSel(y => setSelectedDate(`${y}-${pad(Math.floor(cm / 3) * 3 + 1)}-01`))}</div>
      </>) : freqFilter === "annual" ? (
        <div className="space-y-1.5"><Label>{lang === "bn" ? "বছর" : "Year"}</Label>{yearSel(y => setSelectedDate(`${y}-01-01`))}</div>
      ) : (
        <div className="space-y-1.5"><Label>{t.selectDate}</Label><DatePicker value={selectedDate} onChange={setSelectedDate} /></div>
      )}
    </div>
  );
}
