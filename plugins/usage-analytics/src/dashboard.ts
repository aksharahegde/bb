import type { ConnectedHost } from "./refresh.js";
import type { StoredUsageEvent, UsageStore } from "./store.js";
import type {
  UsageDashboard,
  UsageMetric,
  UsageRange,
} from "./types.js";

function rangeStartIso(range: UsageRange, now = new Date()): string | null {
  if (range === "all") {
    return null;
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

function utcDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function providerSeriesKey(
  provider: StoredUsageEvent["provider"],
): "claudeCode" | "cursor" {
  return provider === "claude-code" ? "claudeCode" : "cursor";
}

function eventTokens(event: StoredUsageEvent): number {
  return (
    event.inputTokens +
    event.cachedInputTokens +
    event.cacheWriteTokens +
    event.outputTokens +
    event.reasoningOutputTokens
  );
}

export function buildUsageDashboard(args: {
  store: UsageStore;
  range: UsageRange;
  metric: UsageMetric;
  hosts: ConnectedHost[];
}): UsageDashboard {
  const sinceIso = rangeStartIso(args.range);
  const events = args.store.queryEventsSince(sinceIso);
  const refreshedAt = args.store.getRefreshedAt();
  const scanStates = new Map(
    args.store.listHostScanStates().map((state) => [state.hostId, state]),
  );

  let totalCostUsdMicros = 0;
  let totalTokens = 0;
  const byProvider = new Map<
    StoredUsageEvent["provider"],
    { costUsdMicros: number; tokens: number; eventCount: number }
  >();
  const byDay = new Map<string, { claudeCode: number; cursor: number }>();
  const modelBreakdown = new Map<
    string,
    {
      model: string;
      provider: StoredUsageEvent["provider"];
      costUsdMicros: number;
      tokens: number;
      eventCount: number;
    }
  >();
  const dayBreakdown = new Map<
    string,
    {
      date: string;
      model: string;
      provider: StoredUsageEvent["provider"];
      costUsdMicros: number;
      tokens: number;
      eventCount: number;
    }
  >();

  let providerReportedCount = 0;
  let modelPricedCount = 0;
  let unpricedCount = 0;

  for (const event of events) {
    const tokens = eventTokens(event);
    const cost = event.costUsdMicros ?? 0;
    totalTokens += tokens;
    totalCostUsdMicros += cost;

    const providerTotals = byProvider.get(event.provider) ?? {
      costUsdMicros: 0,
      tokens: 0,
      eventCount: 0,
    };
    providerTotals.costUsdMicros += cost;
    providerTotals.tokens += tokens;
    providerTotals.eventCount += 1;
    byProvider.set(event.provider, providerTotals);

    const date = utcDateKey(event.occurredAt);
    const dayTotals = byDay.get(date) ?? { claudeCode: 0, cursor: 0 };
    const metricValue = args.metric === "cost" ? cost : tokens;
    dayTotals[providerSeriesKey(event.provider)] += metricValue;
    byDay.set(date, dayTotals);

    const modelKey = `${event.provider}\0${event.model}`;
    const modelTotals = modelBreakdown.get(modelKey) ?? {
      model: event.model,
      provider: event.provider,
      costUsdMicros: 0,
      tokens: 0,
      eventCount: 0,
    };
    modelTotals.costUsdMicros += cost;
    modelTotals.tokens += tokens;
    modelTotals.eventCount += 1;
    modelBreakdown.set(modelKey, modelTotals);

    const dayModelKey = `${date}\0${event.provider}\0${event.model}`;
    const dayModelTotals = dayBreakdown.get(dayModelKey) ?? {
      date,
      model: event.model,
      provider: event.provider,
      costUsdMicros: 0,
      tokens: 0,
      eventCount: 0,
    };
    dayModelTotals.costUsdMicros += cost;
    dayModelTotals.tokens += tokens;
    dayModelTotals.eventCount += 1;
    dayBreakdown.set(dayModelKey, dayModelTotals);

    if (event.costSource === "provider-reported") {
      providerReportedCount += 1;
    } else if (event.costSource === "model-priced") {
      modelPricedCount += 1;
    } else {
      unpricedCount += 1;
    }
  }

  const actualPricedCount = providerReportedCount + modelPricedCount;

  const machines = args.hosts.map((host) => {
    const scan = scanStates.get(host.id);
    return {
      hostId: host.id,
      hostName: host.name,
      status: host.status,
      lastScannedAt: scan?.lastScannedAt ?? null,
      eventCount: scan?.eventCount ?? 0,
    };
  });

  return {
    refreshedAt,
    range: args.range,
    metric: args.metric,
    totalCostUsdMicros,
    totalTokens,
    byProvider: [...byProvider.entries()].map(([provider, totals]) => ({
      provider,
      ...totals,
    })),
    byDay: [...byDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, totals]) => ({ date, ...totals })),
    modelBreakdown: [...modelBreakdown.values()].sort(
      (left, right) => right.costUsdMicros - left.costUsdMicros,
    ),
    dayBreakdown: [...dayBreakdown.values()].sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return right.costUsdMicros - left.costUsdMicros;
    }),
    machines,
    costQuality: {
      eventCount: events.length,
      pricedEventCount: actualPricedCount,
      providerReportedCount,
      modelPricedCount,
      unpricedCount,
    },
  };
}
