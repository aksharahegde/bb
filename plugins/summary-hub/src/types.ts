import { z } from "zod";

export const SUMMARY_SCOPES = ["project", "global"] as const;
export const SUMMARY_PERIODS = ["daily", "weekly"] as const;

export type SummaryScope = (typeof SUMMARY_SCOPES)[number];
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

export const summaryMetricsSchema = z
  .object({
    agent_threads_count: z.number().int().nonnegative(),
    commits_count: z.number().int().nonnegative(),
    tasks_completed_count: z.number().int().nonnegative(),
    decisions_logged_count: z.number().int().nonnegative(),
    deferred_items_count: z.number().int().nonnegative(),
  })
  .strict();

export const summaryRecordSchema = z
  .object({
    id: z.string(),
    scope: z.enum(SUMMARY_SCOPES),
    project_name: z.string().nullable(),
    period: z.enum(SUMMARY_PERIODS),
    date_key: z.string(),
    created_at: z.string(),
    metrics: summaryMetricsSchema,
    executive_summary: z.string(),
    key_outcomes: z.array(z.string()),
    architectural_changes: z.array(z.string()),
    agent_activity_highlights: z.array(z.string()),
    pending_blockers: z.array(z.string()),
    raw_source_refs: z.array(z.string()),
    project_breakdown: z
      .array(
        z
          .object({
            project_id: z.string(),
            project_name: z.string(),
            status: z.enum(["active", "idle", "blocked"]),
            summary_id: z.string().nullable(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type SummaryMetrics = z.infer<typeof summaryMetricsSchema>;
export type SummaryRecord = z.infer<typeof summaryRecordSchema>;

export interface GitCommitEntry {
  hash: string;
  subject: string;
  author: string;
  committedAt: string;
}

export interface CollectedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  completed_at: string | null;
  resolution_summary: string | null;
}

export interface CollectedDecision {
  id: string;
  title: string;
  status: string;
  date: string;
}

export interface CollectedThread {
  id: string;
  title: string | null;
  originKind: string | null;
  originPluginId: string | null;
  updatedAt: number;
}

export interface SourceBundle {
  windowStart: string;
  windowEnd: string;
  commits: GitCommitEntry[];
  tasksCompleted: CollectedTask[];
  tasksDeferred: CollectedTask[];
  decisions: CollectedDecision[];
  threads: CollectedThread[];
}

export interface SynthesisPayload {
  executive_summary: string;
  key_outcomes: string[];
  architectural_changes: string[];
  agent_activity_highlights: string[];
  pending_blockers: string[];
}
