import { describe, expect, it } from "vitest";
import { localDayNightFactor } from "./day-night.js";

describe("localDayNightFactor", () => {
  it("is brightest around noon", () => {
    const noon = localDayNightFactor(new Date("2026-08-07T12:00:00"));
    const midnight = localDayNightFactor(new Date("2026-08-07T00:00:00"));
    expect(noon).toBeGreaterThan(midnight);
  });

  it("stays within a night-to-day range", () => {
    const factor = localDayNightFactor(new Date("2026-08-07T18:30:00"));
    expect(factor).toBeGreaterThan(0.3);
    expect(factor).toBeLessThanOrEqual(1);
  });
});
