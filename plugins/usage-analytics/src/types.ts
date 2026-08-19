import { z } from "zod";

export const USAGE_RANGES = ["7d", "30d", "90d", "all"] as const;
export type UsageRange = (typeof USAGE_RANGES)[number];

export const USAGE_METRICS = ["cost", "tokens"] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export const usageProviderSchema = z.enum(["claude-code", "cursor"]);
export type UsageProvider = z.infer<typeof usageProviderSchema>;

export const usageCostSourceSchema = z.enum([
  "provider-reported",
  "model-priced",
  "unpriced",
]);
export type UsageCostSource = z.infer<typeof usageCostSourceSchema>;

export const usageDaySeriesPointSchema = z
  .object({
    date: z.string(),
    claudeCode: z.number(),
    cursor: z.number(),
  })
  .strict();

export const usageProviderBreakdownSchema = z
  .object({
    provider: usageProviderSchema,
    costUsdMicros: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative(),
  })
  .strict();

export const usageModelBreakdownSchema = z
  .object({
    model: z.string(),
    provider: usageProviderSchema,
    costUsdMicros: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative(),
  })
  .strict();

export const usageDayModelRowSchema = z
  .object({
    date: z.string(),
    model: z.string(),
    provider: usageProviderSchema,
    costUsdMicros: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative(),
  })
  .strict();

export const usageMachineCoverageSchema = z
  .object({
    hostId: z.string(),
    hostName: z.string(),
    status: z.enum(["connected", "disconnected"]),
    lastScannedAt: z.string().datetime().nullable(),
    eventCount: z.number().int().nonnegative(),
  })
  .strict();

export const usageCostQualitySchema = z
  .object({
    eventCount: z.number().int().nonnegative(),
    pricedEventCount: z.number().int().nonnegative(),
    providerReportedCount: z.number().int().nonnegative(),
    modelPricedCount: z.number().int().nonnegative(),
    unpricedCount: z.number().int().nonnegative(),
  })
  .strict();

export const usageDashboardSchema = z
  .object({
    refreshedAt: z.string().datetime().nullable(),
    range: z.enum(USAGE_RANGES),
    metric: z.enum(USAGE_METRICS),
    totalCostUsdMicros: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    byProvider: z.array(usageProviderBreakdownSchema),
    byDay: z.array(usageDaySeriesPointSchema),
    modelBreakdown: z.array(usageModelBreakdownSchema),
    dayBreakdown: z.array(usageDayModelRowSchema),
    machines: z.array(usageMachineCoverageSchema),
    costQuality: usageCostQualitySchema,
  })
  .strict();

export type UsageDashboard = z.infer<typeof usageDashboardSchema>;
