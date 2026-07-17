import { useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sk } from "date-fns/locale/sk";
import { cn } from "@/lib/utils";
import { expandNights, fromISODate, toISODate, type Range } from "@/lib/dates";

export type ColoredRange = Range & {
  color: string;
  source: "booking" | "imported" | "manual";
  label?: string | null;
};

type Props = {
  ranges: ColoredRange[];
  selected: DateRange | undefined;
  onSelect: (r: DateRange | undefined) => void;
  numberOfMonths?: number;
  /** When true, disables days already covered by any range. */
  disableBlocked?: boolean;
};

export function AdminAvailabilityCalendar({
  ranges,
  selected,
  onSelect,
  numberOfMonths = 2,
  disableBlocked = true,
}: Props) {
  // date iso -> first color that covers it (booking/manual > imported priority)
  const dayColor = useMemo(() => {
    const priority = { booking: 3, manual: 2, imported: 1 } as const;
    const chosen = new Map<string, { color: string; p: number; label?: string | null }>();
    for (const r of ranges) {
      for (const iso of expandNights(r.start, r.end)) {
        const p = priority[r.source];
        const cur = chosen.get(iso);
        if (!cur || p > cur.p) chosen.set(iso, { color: r.color, p, label: r.label });
      }
    }
    return chosen;
  }, [ranges]);

  const disabledDates = useMemo(() => {
    if (!disableBlocked) return [] as Date[];
    return Array.from(dayColor.keys()).map(fromISODate);
  }, [dayColor, disableBlocked]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-[var(--shadow-card)]">
      <DayPicker
        mode="range"
        locale={sk}
        selected={selected}
        onSelect={onSelect}
        numberOfMonths={numberOfMonths}
        disabled={[{ before: today }, ...disabledDates]}
        showOutsideDays={false}
        weekStartsOn={1}
        components={{
          Chevron: (p) =>
            p.orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
          DayButton: ({ day, modifiers, className, ...rest }) => {
            const iso = toISODate(day.date);
            const info = dayColor.get(iso);
            return (
              <button
                {...rest}
                className={cn(
                  "relative h-9 w-9 inline-flex items-center justify-center rounded-md font-normal hover:bg-accent transition-colors",
                  modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary",
                  modifiers.disabled && "text-muted-foreground/50 cursor-not-allowed",
                  className,
                )}
                title={info?.label ?? undefined}
              >
                {day.date.getDate()}
                {info && !modifiers.selected && (
                  <span
                    className="absolute inset-x-1 bottom-0.5 h-1 rounded-full"
                    style={{ background: info.color }}
                  />
                )}
              </button>
            );
          },
        }}
        classNames={{
          months: "flex flex-col sm:flex-row gap-6",
          month: "space-y-3 relative",
          month_caption: "flex justify-center pt-1 items-center font-display text-lg",
          nav: "absolute inset-x-1 top-0 flex items-center justify-between z-10 pointer-events-none",
          button_previous: cn(
            "size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-foreground/70 pointer-events-auto disabled:opacity-30 disabled:pointer-events-none",
          ),
          button_next: cn(
            "size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-foreground/70 pointer-events-auto disabled:opacity-30 disabled:pointer-events-none",
          ),

          month_grid: "w-full border-collapse",
          weekdays: "flex",
          weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem] uppercase tracking-wider",
          week: "flex w-full mt-1",
          day: "h-9 w-9 text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
          range_middle: "bg-accent/60 text-accent-foreground rounded-none",
          today: "font-semibold text-primary",
          hidden: "invisible",
        }}
      />
    </div>
  );
}
