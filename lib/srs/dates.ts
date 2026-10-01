export const DEFAULT_TIMEZONE = "Europe/Kyiv";

/** Today's calendar date as YYYY-MM-DD in the given IANA time zone. */
export function todayIn(
  timeZone: string = process.env.APP_TIMEZONE ?? DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar-day arithmetic on a YYYY-MM-DD string (immune to DST). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
