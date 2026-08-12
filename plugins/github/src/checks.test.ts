import { describe, expect, it } from "vitest";
import {
  formatChecksSummaryLine,
  normalizeStatusCheckRollup,
  summarizeChecks,
} from "./checks.js";

describe("github checks helpers", () => {
  it("normalizes CheckRun and StatusContext rollup rows", () => {
    const checks = normalizeStatusCheckRollup([
      { name: "build", conclusion: "SUCCESS", status: "COMPLETED" },
      { name: "test", conclusion: "FAILURE", status: "COMPLETED" },
      { name: "lint", conclusion: "", status: "IN_PROGRESS" },
      { context: "deploy", state: "SUCCESS", targetUrl: "https://example" },
    ]);
    expect(checks.map((check) => check.status)).toEqual([
      "success",
      "failure",
      "pending",
      "success",
    ]);
    expect(checks[3]?.name).toBe("deploy");
  });

  it("summarizes and formats failing names", () => {
    const summary = summarizeChecks(
      normalizeStatusCheckRollup([
        { name: "build", conclusion: "SUCCESS", status: "COMPLETED" },
        { name: "test", conclusion: "FAILURE", status: "COMPLETED" },
        { name: "e2e", conclusion: "FAILURE", status: "COMPLETED" },
      ]),
    );
    expect(summary).toEqual({
      success: 1,
      failure: 2,
      pending: 0,
      neutral: 0,
      failingNames: ["test", "e2e"],
    });
    expect(formatChecksSummaryLine(summary)).toContain("failing: test, e2e");
  });
});
