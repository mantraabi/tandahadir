// src/lib/date.ts
// Date utilities normalized to Asia/Jakarta timezone.
//
// All "today" / "yesterday" / "startOfDay" computations should go through
// these helpers to avoid timezone bugs when the server runs in UTC but
// users are in Asia/Jakarta (UTC+7).

const TZ = "Asia/Jakarta";

/**
 * Get the current date in Asia/Jakarta as a Date object representing
 * UTC-midnight of that local date. Suitable for Prisma `@db.Date` fields.
 *
 * Example: When called at 2026-04-28 11:30 WIB (= 04:30 UTC),
 * returns Date object for 2026-04-28T00:00:00.000Z.
 */
export function getJakartaToday(): Date {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Start of day (UTC-midnight) in Asia/Jakarta for a given Date.
 */
export function startOfJakartaDay(d: Date): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * End of day (UTC-23:59:59.999 of the same Jakarta date) for a given Date.
 */
export function endOfJakartaDay(d: Date): Date {
  const start = startOfJakartaDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Add days to a Date and return the corresponding Jakarta day-start.
 */
export function addJakartaDays(d: Date, days: number): Date {
  const start = startOfJakartaDay(d);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * YYYY-MM-DD string for a Date, in Asia/Jakarta timezone.
 */
export function jakartaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Format a Date as a long Indonesian date string in Asia/Jakarta.
 * Example: "Selasa, 28 April 2026"
 */
export function formatJakartaLongDate(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}
