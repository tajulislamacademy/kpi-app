import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "../lib";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

// value/onChange use "yyyy-MM-dd" strings (drop-in for <input type="date">),
// parsed/formatted in LOCAL time to avoid timezone day-shift.
function parseLocal(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; }

export function DatePicker({ value, onChange, placeholder = "তারিখ নির্বাচন", className }: Props) {
  const [open, setOpen] = useState(false);
  const date = parseLocal(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-50 justify-start text-left font-normal", !date && "text-muted-foreground", className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { onChange(toStr(d)); setOpen(false); } }} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
