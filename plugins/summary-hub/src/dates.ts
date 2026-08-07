export function formatDailyDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDailyDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (match === null) {
    throw new Error(`Invalid daily date key "${dateKey}"`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function isoWeekParts(date: Date): { year: number; week: number } {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { year: utc.getUTCFullYear(), week };
}

export function formatWeeklyDateKey(date: Date): string {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function parseWeeklyDateKey(dateKey: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(dateKey);
  if (match === null) {
    throw new Error(`Invalid weekly date key "${dateKey}"`);
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  return new Date(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate(),
  );
}

export function resolveDateKey(period: "daily" | "weekly", target?: string): string {
  if (target !== undefined && target.trim().length > 0) {
    return target.trim();
  }
  const now = new Date();
  return period === "daily" ? formatDailyDateKey(now) : formatWeeklyDateKey(now);
}

export function windowForPeriod(
  period: "daily" | "weekly",
  dateKey: string,
): { start: Date; end: Date } {
  if (period === "daily") {
    const start = parseDailyDateKey(dateKey);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  const start = parseWeeklyDateKey(dateKey);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function shiftDateKey(
  period: "daily" | "weekly",
  dateKey: string,
  delta: -1 | 1,
): string {
  if (period === "daily") {
    const date = parseDailyDateKey(dateKey);
    date.setDate(date.getDate() + delta);
    return formatDailyDateKey(date);
  }
  const date = parseWeeklyDateKey(dateKey);
  date.setDate(date.getDate() + delta * 7);
  return formatWeeklyDateKey(date);
}

export function buildSummaryId(
  period: "daily" | "weekly",
  dateKey: string,
): string {
  const normalized = dateKey.replace(/-/g, "-");
  return period === "daily"
    ? `SUM-DAILY-${normalized}`
    : `SUM-WEEKLY-${normalized}`;
}
