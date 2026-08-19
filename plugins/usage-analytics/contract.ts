import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  USAGE_METRICS,
  USAGE_RANGES,
  usageDashboardSchema,
} from "./src/types.js";

export const REALTIME_CHANNEL = "usage-analytics-changed";

export const usageAnalyticsRpcContract = defineRpcContract({
  getUsageDashboard: {
    input: z
      .object({
        range: z.enum(USAGE_RANGES),
        metric: z.enum(USAGE_METRICS),
      })
      .strict(),
    output: usageDashboardSchema,
  },
  refreshUsage: {
    input: z
      .object({
        sinceDays: z.number().int().min(1).max(36_500).nullable(),
      })
      .strict(),
    output: z
      .object({
        refreshedAt: z.string().datetime(),
        hostsScanned: z.number().int().nonnegative(),
        hostsSkipped: z.number().int().nonnegative(),
        eventsInserted: z.number().int().nonnegative(),
        truncated: z.boolean(),
      })
      .strict(),
  },
});
