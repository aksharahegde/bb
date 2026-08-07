import { describe, expect, it } from "vitest";
import { exportSummary } from "./export.js";
import type { SummaryRecord } from "./types.js";

const sample: SummaryRecord = {
  id: "SUM-DAILY-2026-08-07",
  scope: "project",
  project_name: "bb",
  period: "daily",
  date_key: "2026-08-07",
  created_at: "2026-08-07T18:00:00.000Z",
  metrics: {
    agent_threads_count: 2,
    commits_count: 3,
    tasks_completed_count: 1,
    decisions_logged_count: 1,
    deferred_items_count: 0,
  },
  executive_summary: "Shipped summary hub.",
  key_outcomes: ["Added summary hub plugin"],
  architectural_changes: ["ADR-001: Summary storage layout"],
  agent_activity_highlights: ["th_1: built panel"],
  pending_blockers: [],
  raw_source_refs: ["thread:th_1"],
};

describe("exportSummary", () => {
  it("exports markdown", () => {
    const content = exportSummary(sample, "markdown");
    expect(content).toContain("# SUM-DAILY-2026-08-07");
    expect(content).toContain("Shipped summary hub.");
  });

  it("exports slack text", () => {
    const content = exportSummary(sample, "slack");
    expect(content).toContain("*SUM-DAILY-2026-08-07*");
    expect(content).toContain("Commits: 3");
  });
});
