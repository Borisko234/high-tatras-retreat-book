import { useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sk } from "date-fns/locale/sk";
import { enUS } from "date-fns/locale/en-US";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { expandNights, fromISODate, type Range } from "@/lib/dates";

type Props = {
  blocked: Range[];
  selected: DateRange | undefined;
  onSelect: (r: DateRange | undefined) => void;
  numberOfMonths?: number;
};

export function AvailabilityCalendar({ blocked, selected, onSelect, numberOfMonths = 2 }: Props) {
  const { lang, t } = useI18n();

  const disabledDates = useMemo(() => {
    const dates: Date[] = [];
    for (const r of blocked) {
      for (const iso of expandNights(r.start, r.end)) dates.push(fromISODate(iso));
    }
    return dates;
  }, [blocked]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-[var(--shadow-card)]">
      <DayPicker
        mode="range"
        locale={lang === "sk" ? sk : enUS}
        selected={selected}
        onSelect={onSelect}
        numberOfMonths={numberOfMonths}
        disabled={[{ before: today }, ...disabledDates]}
        showOutsideDays={false}
        weekStartsOn={1}
        components={{
          Chevron: (p) =>
            p.orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
        }}
        classNames={{
          months: "flex flex-col sm:flex-row gap-6",
          month: "space-y-3",
          month_caption: "flex justify-center pt-1 relative items-center font-display text-lg",
          nav: "flex items-center gap-1",
          button_previous: cn(
            "absolute left-1 top-1 size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-foreground/70",
          ),
          button_next: cn(
            "absolute right-1 top-1 size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-foreground/70",
          ),
          month_grid: "w-full border-collapse",
          weekdays: "flex",
          weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem] uppercase tracking-wider",
          week: "flex w-full mt-1",
          day: "h-9 w-9 text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
          day_button: cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-md font-normal aria-selected:opacity-100 hover:bg-accent transition-colors",
          ),
          range_start: "rounded-l-md bg-primary text-primary-foreground hover:bg-primary",
          range_end: "rounded-r-md bg-primary text-primary-foreground hover:bg-primary",
          range_middle: "bg-accent/60 text-accent-foreground rounded-none",
          today: "font-semibold text-primary",
          disabled: "text-muted-foreground/40 line-through cursor-not-allowed hover:bg-transparent",
          hidden: "invisible",
        }}
      />
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-border bg-background" />
          {t("booking.legend.available")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" />
          {t("booking.legend.selected")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-muted-foreground/30 line-through" />
          {t("booking.legend.blocked")}
        </span>
      </div>
    </div>
  );
}
