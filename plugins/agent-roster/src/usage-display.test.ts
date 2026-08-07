import { describe, expect, it } from "vitest";
import { summarizeProviderUsage } from "./usage-display.js";

describe("summarizeProviderUsage", () => {
  it("returns the highest provider utilization window", () => {
    const summary = summarizeProviderUsage({
      codex: { status: "not_installed" },
      claudeCode: {
        status: "ok",
        windows: [{ label: "Weekly", usedPercent: 42 }],
      },
      cursor: {
        status: "ok",
        windows: [{ label: "Fast", usedPercent: 68 }],
      },
    });
    expect(summary.available).toBe(true);
    expect(summary.usedPercent).toBe(68);
    expect(summary.label).toBe("Fast 68%");
  });

  it("reports unavailable when no provider returns windows", () => {
    const summary = summarizeProviderUsage({
      codex: { status: "unauthenticated" },
      claudeCode: { status: "not_installed" },
      cursor: { status: "expired" },
    });
    expect(summary.available).toBe(false);
    expect(summary.usedPercent).toBeNull();
  });
});
