import { describe, expect, it } from "vitest";
import {
  formatDailyDateKey,
  formatWeeklyDateKey,
  resolveDateKey,
  shiftDateKey,
  windowForPeriod,
} from "./dates.js";

describe("dates", () => {
  it("formats daily and weekly keys", () => {
    const date = new Date(2026, 7, 7);
    expect(formatDailyDateKey(date)).toBe("2026-08-07");
    expect(formatWeeklyDateKey(new Date("2026-08-07T12:00:00"))).toMatch(
      /^2026-W\d{2}$/,
    );
  });

  it("shifts daily keys", () => {
    expect(shiftDateKey("daily", "2026-08-07", -1)).toBe("2026-08-06");
    expect(shiftDateKey("daily", "2026-08-07", 1)).toBe("2026-08-08");
  });

  it("builds windows", () => {
    const { start, end } = windowForPeriod("daily", "2026-08-07");
    expect(start.getFullYear()).toBe(2026);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("defaults resolveDateKey to today", () => {
    expect(resolveDateKey("daily")).toBe(formatDailyDateKey(new Date()));
  });
});
