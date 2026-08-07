import { defineRpcContract } from "@bb/plugin-sdk";
import { z } from "zod";
import { SUMMARY_PERIODS, SUMMARY_SCOPES, summaryRecordSchema } from "./src/types.js";

export const REALTIME_CHANNEL = "summary-hub-changed";

export const summaryHubRpcContract = defineRpcContract({
  listProjects: {
    input: z.null(),
    output: z
      .object({
        projects: z.array(
          z
            .object({
              id: z.string(),
              name: z.string(),
              kind: z.enum(["personal", "standard"]),
              hasSource: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict(),
  },
  getSummary: {
    input: z
      .object({
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        dateKey: z.string(),
        projectId: z.string().optional(),
      })
      .strict(),
    output: z
      .object({
        summary: summaryRecordSchema.nullable(),
      })
      .strict(),
  },
  listSummaries: {
    input: z
      .object({
        scope: z.enum(SUMMARY_SCOPES).optional(),
        period: z.enum(SUMMARY_PERIODS).optional(),
        limit: z.number().int().positive().max(100).optional(),
        projectId: z.string().optional(),
      })
      .strict(),
    output: z.object({ summaries: z.array(summaryRecordSchema) }).strict(),
  },
  generateSummary: {
    input: z
      .object({
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        targetDate: z.string().optional(),
        projectId: z.string().optional(),
      })
      .strict(),
    output: z.object({ summary: summaryRecordSchema }).strict(),
  },
  exportSummary: {
    input: z
      .object({
        summaryId: z.string(),
        format: z.enum(["markdown", "slack"]),
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        dateKey: z.string(),
        projectId: z.string().optional(),
      })
      .strict(),
    output: z.object({ content: z.string() }).strict(),
  },
  ensureTodaySummary: {
    input: z
      .object({
        projectId: z.string(),
      })
      .strict(),
    output: z
      .object({
        generated: z.boolean(),
        summary: summaryRecordSchema.nullable(),
      })
      .strict(),
  },
});
