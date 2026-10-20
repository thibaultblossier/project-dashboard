import type { ISODate } from './types';

// All date math is done on integer "day numbers" (days since 1970-01-01, UTC)
// so time zones and DST never shift a deadline.

const MS_PER_DAY = 86_400_000;

export function toDay(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromDay(day: number): Date {
  return new Date(day * MS_PER_DAY);
}

/** Today in the viewer's calendar, or `?today=YYYY-MM-DD` to preview another date. */
export function currentDay(): number {
  const override = new URLSearchParams(location.search).get('today');
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return toDay(override);
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY;
}

const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

/** "13 janv." */
export const shortDate = (day: number) => fmtShort.format(fromDay(day));
/** "mardi 20 octobre 2026" */
export const longDate = (day: number) => fmtLong.format(fromDay(day));
/** "janv." */
export const monthLabel = (day: number) => fmtMonth.format(fromDay(day));

/** Day numbers of the 1st of each month strictly after `start` and up to `end`. */
export function monthStarts(start: number, end: number): number[] {
  const out: number[] = [];
  const d = fromDay(start);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  for (;;) {
    if (m > 11) { m = 0; y++; }
    const day = Date.UTC(y, m, 1) / MS_PER_DAY;
    if (day > end) return out;
    out.push(day);
    m++;
  }
}

export const yearOf = (day: number) => fromDay(day).getUTCFullYear();

export interface AxisMonth {
  day: number;
  label: string;
  /** False for the partial month the axis starts in (label only, no gridline). */
  line: boolean;
}

/**
 * Month ticks for a time axis. The first label and every January carry the year;
 * a partial leading month still gets a label when there is room for it.
 */
export function axisMonths(lo: number, hi: number): AxisMonth[] {
  const out: AxisMonth[] = monthStarts(lo - 1, hi).map((day) => ({ day, label: monthLabel(day), line: true }));
  if (fromDay(lo).getUTCDate() !== 1 && (!out.length || out[0].day - lo >= 12)) out.unshift({ day: lo, label: monthLabel(lo), line: false });
  out.forEach((t, i) => {
    if (i === 0 || fromDay(t.day).getUTCMonth() === 0) t.label += ` ${yearOf(t.day)}`;
  });
  return out;
}

/** "dans 5 j", "aujourd’hui", "il y a 3 j" */
export function relative(day: number, today: number): string {
  const diff = day - today;
  if (diff === 0) return 'aujourd’hui';
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  return diff > 0 ? `dans ${diff} j` : `il y a ${-diff} j`;
}
