// All dates as YYYY-MM-DD strings (timezone-free, like iCal DATE values).
// Ranges are half-open: [start, end) — `end` is the check-out date (not occupied).

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function nightsBetween(start: string, end: string): number {
  const a = fromISODate(start).getTime();
  const b = fromISODate(end).getTime();
  return Math.round((b - a) / 86400000);
}

export type Range = { start: string; end: string };

/** Returns true if any night in [start, end) overlaps any blocked range. */
export function rangeOverlaps(start: string, end: string, blocked: Range[]): boolean {
  return blocked.some((b) => start < b.end && end > b.start);
}

/** Expand a half-open date range into an array of YYYY-MM-DD occupied nights. */
export function expandNights(start: string, end: string): string[] {
  const out: string[] = [];
  const d = fromISODate(start);
  const stop = fromISODate(end);
  while (d < stop) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
