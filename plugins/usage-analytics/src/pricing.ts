import type { UsageHistoryCostSource, UsageHistoryEvent } from "@bb/host-daemon-contract";
import { MODEL_PRICING_CATALOG, type ModelPricingRow } from "./pricing-catalog.js";

export interface PricedUsageEvent {
  costSource: UsageHistoryCostSource;
  costUsdMicros: number | null;
}

export function normalizeModelName(model: string): string {
  return model.trim().toLowerCase();
}

export function resolveModelPricing(model: string): ModelPricingRow | null {
  const normalized = normalizeModelName(model);
  if (normalized.length === 0 || normalized === "unknown") {
    return null;
  }
  for (const row of MODEL_PRICING_CATALOG) {
    const pattern = row.modelPattern.toLowerCase();
    if (normalized === pattern || normalized.startsWith(`${pattern}-`)) {
      return row;
    }
  }
  return null;
}

export function totalTokensFromEvent(event: UsageHistoryEvent): number {
  return (
    event.inputTokens +
    event.cachedInputTokens +
    event.cacheWriteTokens +
    event.outputTokens +
    event.reasoningOutputTokens
  );
}

export function priceEventFromCatalog(event: UsageHistoryEvent): number | null {
  const pricing = resolveModelPricing(event.model);
  if (!pricing) {
    return null;
  }
  const numerator =
    event.inputTokens * pricing.inputMicrosPerMillion +
    event.cachedInputTokens * pricing.cacheReadMicrosPerMillion +
    event.cacheWriteTokens * pricing.cacheWriteMicrosPerMillion +
    (event.outputTokens + event.reasoningOutputTokens) *
      pricing.outputMicrosPerMillion;
  if (numerator <= 0) {
    return 0;
  }
  return Math.round(numerator / 1_000_000);
}

export function resolveEventPricing(event: UsageHistoryEvent): PricedUsageEvent {
  if (event.costUsdMicros !== null) {
    return {
      costSource: event.costSource,
      costUsdMicros: event.costUsdMicros,
    };
  }
  const catalogCost = priceEventFromCatalog(event);
  if (catalogCost !== null) {
    return {
      costSource: "model-priced",
      costUsdMicros: catalogCost,
    };
  }
  return {
    costSource: "unpriced",
    costUsdMicros: null,
  };
}

export function microsToDisplayCents(micros: number): number {
  return Math.round(micros / 10_000) / 100;
}
