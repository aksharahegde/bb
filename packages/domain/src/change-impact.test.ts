import { describe, expect, it } from "vitest";
import {
  computeChangeImpact,
  renderChangeImpactContextChunk,
  scoreChangeImpactSeverity,
} from "./change-impact.js";

describe("change-impact", () => {
  it("scores severity from file count, sensitive paths, and hubs", () => {
    expect(
      scoreChangeImpactSeverity({
        changedFileCount: 0,
        sensitiveCount: 0,
        affectedHubCount: 0,
      }),
    ).toBe("none");
    expect(
      scoreChangeImpactSeverity({
        changedFileCount: 2,
        sensitiveCount: 0,
        affectedHubCount: 0,
      }),
    ).toBe("low");
    expect(
      scoreChangeImpactSeverity({
        changedFileCount: 10,
        sensitiveCount: 1,
        affectedHubCount: 1,
      }),
    ).toBe("medium");
    expect(
      scoreChangeImpactSeverity({
        changedFileCount: 30,
        sensitiveCount: 2,
        affectedHubCount: 3,
      }),
    ).toBe("high");
  });

  it("builds a report with validation hints and truncates context", () => {
    const report = computeChangeImpact({
      changedFiles: [
        "apps/server/src/routes/auth.ts",
        "package.json",
        "apps/app/src/components/Widget.tsx",
      ],
      affectedHubs: ["AuthService", "Widget"],
    });
    expect(report.severity).not.toBe("none");
    expect(report.sensitivePaths).toContain("package.json");
    expect(report.affectedHubs).toEqual(["AuthService", "Widget"]);
    expect(report.validationHints.length).toBeGreaterThan(0);
    const chunk = renderChangeImpactContextChunk(report);
    expect(chunk).toContain("Change Impact");
    expect(chunk).toContain("bb graphify affected");
  });
});
