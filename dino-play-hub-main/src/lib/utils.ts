import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utilities for handling dates/times in Colombia (America/Bogota) timezone.
 *
 * JS `Date` objects are created in the user's local timezone by default, which
 * can lead to inconsistent behaviour when users or servers are located in a
 * different region. The application stores and queries dates based on a
 * simple YYYY-MM-DD string (`settlement_date`, `config_date`), and when
 * generating timestamps we want them anchored to Colombia time regardless of
 * where the code runs.
 */

// Build a date object that represents *now* in the Bogota timezone. Instead of
// parsing a locale-formatted string (which gets interpreted in the local
// timezone and can shift the day depending on the user's offset), we ask
// Intl.DateTimeFormat for the individual date/time parts and then construct
// a UTC timestamp. That ensures the resulting `Date` has the correct wall-clock
// time in America/Bogota no matter where the code runs.
export function colombiaNow(): Date {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date());
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  });

  // build a UTC date that has the same y/m/d/h/m/s as the Bogota wall clock
  return new Date(Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    parseInt(map.hour, 10),
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  ));
}

// Return an ISO string representing the current moment in Colombia. Suitable
// for storing in timestamptz columns or any other case where we want an
// absolute timestamp.
export function colombiaNowISO(): string {
  return colombiaNow().toISOString();
}

// Convenience helpers that mirror the patterns already used throughout the
// codebase.
export function colombiaToday(): string {
  return colombiaNowISO().split("T")[0];
}

// Format an arbitrary date for display in the Bogota timezone. We default to
// the Spanish (Colombia) locale but accept any Intl options.
export function formatDateColombia(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    ...options,
  });
}

// Convert a Date or the current moment into a plain ISO-style date string
// (YYYY‑MM‑DD) based on the Colombia timezone. Useful for storing/querying
// database columns that only contain the date portion.
export function colombiaYYYYMMDD(date: Date = new Date()): string {
  // reuse colombiaNow logic by temporarily shifting the system clock via
  // formatting parts.  We can convert the provided `date` to the Bogota
  // equivalent by using the same Intl trick as above.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  });
  return `${map.year}-${map.month}-${map.day}`;
}

