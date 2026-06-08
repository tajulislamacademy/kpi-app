import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pt-5", className)}
      classNames={{
        ...d,
        months: cn("relative flex flex-col gap-4 sm:flex-row", d.months),
        month: cn("flex flex-col gap-4", d.month),
        nav: cn("absolute inset-x-0 top-0 flex items-center justify-between px-1", d.nav),
        button_previous: cn(buttonVariants({ variant: "outline" }), "size-7 p-0 opacity-60 hover:opacity-100", d.button_previous),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-7 p-0 opacity-60 hover:opacity-100", d.button_next),
        month_caption: cn("flex h-7 items-center justify-center px-8", d.month_caption),
        caption_label: cn("text-sm font-medium", d.caption_label),
        month_grid: cn("w-full border-collapse", d.month_grid),
        weekdays: cn("flex", d.weekdays),
        weekday: cn("w-8 text-[0.8rem] font-normal text-muted-foreground", d.weekday),
        week: cn("mt-2 flex w-full", d.week),
        day: cn("size-8 p-0 text-center text-sm", d.day),
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-8 p-0 font-normal aria-selected:opacity-100", d.day_button),
        selected: cn("rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground", d.selected),
        today: cn("rounded-md bg-accent text-accent-foreground", d.today),
        outside: cn("text-muted-foreground opacity-50", d.outside),
        disabled: cn("text-muted-foreground opacity-50", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
