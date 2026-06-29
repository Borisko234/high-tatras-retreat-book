// Minimal iCal parser & generator. Workers-compatible (pure JS, no native deps).
// Supports the subset Booking/Airbnb/Housy/Megaubytovanie use: VEVENT with
// DTSTART;VALUE=DATE and DTEND;VALUE=DATE (or full DATETIME).

export type ParsedEvent = {
  uid: string;
  summary: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (exclusive)
};

function parseIcalDate(raw: string): string {
  // Handles "YYYYMMDD" and "YYYYMMDDTHHMMSSZ" — we only need the date part.
  const v = raw.trim();
  const y = v.slice(0, 4);
  const m = v.slice(4, 6);
  const d = v.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function parseICS(text: string): ParsedEvent[] {
  // Unfold continuation lines (RFC 5545: lines starting with space/tab continue previous)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      cur = {};
    } else if (line === "END:VEVENT") {
      if (cur && cur.start && cur.end) {
        events.push({
          uid: cur.uid ?? crypto.randomUUID(),
          summary: cur.summary ?? "Blocked",
          start: cur.start,
          end: cur.end,
        });
      }
      cur = null;
    } else if (cur) {
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) continue;
      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      const key = keyPart.split(";")[0].toUpperCase();
      if (key === "UID") cur.uid = value;
      else if (key === "SUMMARY") cur.summary = value;
      else if (key === "DTSTART") cur.start = parseIcalDate(value);
      else if (key === "DTEND") cur.end = parseIcalDate(value);
    }
  }
  return events;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUTCStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function compactDate(iso: string): string {
  return iso.replaceAll("-", "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function generateICS(events: ParsedEvent[], propertyName: string): string {
  const stamp = formatUTCStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(propertyName)}//Reservations//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(propertyName)}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${compactDate(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(e.end)}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
