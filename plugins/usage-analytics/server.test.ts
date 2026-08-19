import { describe, expect, it } from "vitest";
import {
  createFakePluginHost,
  type CreateFakePluginHostOptions,
  type FakePluginHost,
} from "@get-bb/plugin-sdk/testing";
import type { UsageHistoryEvent, UsageHistoryScanResult } from "@bb/host-daemon-contract";
import usageAnalyticsPlugin from "./server.js";
import { priceEventFromCatalog } from "./src/pricing.js";
import type { UsageDashboard } from "./src/types.js";

const SAMPLE_CLAUDE_EVENT: UsageHistoryEvent = {
  id: "claude-code:session-1:msg-1",
  provider: "claude-code",
  source: "claude-jsonl",
  model: "claude-sonnet-4-20250514",
  occurredAt: "2026-08-10T12:00:00.000Z",
  inputTokens: 1_000_000,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 100_000,
  reasoningOutputTokens: 0,
  costSource: "unpriced",
  costUsdMicros: null,
};

const SAMPLE_CURSOR_EVENT: UsageHistoryEvent = {
  id: "cursor-ide:composer-1",
  provider: "cursor",
  source: "cursor-ide-composer",
  model: "claude-sonnet-4",
  occurredAt: "2026-08-10T13:00:00.000Z",
  inputTokens: 0,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  costSource: "provider-reported",
  costUsdMicros: 80_000,
};

const scanHosts = (async ({ hostId }) => {
  const scanResult: UsageHistoryScanResult =
    hostId === "host-a"
      ? {
          events: [SAMPLE_CLAUDE_EVENT, SAMPLE_CURSOR_EVENT],
          fileCursors: [],
          truncated: false,
          scannedAt: "2026-08-10T14:00:00.000Z",
        }
      : {
          events: [SAMPLE_CLAUDE_EVENT],
          fileCursors: [],
          truncated: false,
          scannedAt: "2026-08-10T14:00:00.000Z",
        };
  return scanResult;
}) as NonNullable<CreateFakePluginHostOptions["callRetryableOnlineRpc"]>;

async function loadPlugin(
  options: Parameters<typeof createFakePluginHost>[0] = {},
): Promise<FakePluginHost> {
  const host = createFakePluginHost({
    pluginId: "usage-analytics",
    ...options,
  });
  await usageAnalyticsPlugin(host.bb);
  return host;
}

describe("bb-plugin-usage-analytics", () => {
  it("registers dashboard and refresh RPC methods", async () => {
    const host = await loadPlugin({
      sdk: {
        hosts: {
          list: async () => [],
        },
      },
    });
    expect(host.harness.registrations.rpcMethods).toEqual([
      "getUsageDashboard",
      "refreshUsage",
    ]);
  });

  it("prices Claude events from the committed catalog", () => {
    expect(priceEventFromCatalog(SAMPLE_CLAUDE_EVENT)).toBe(4_500_000);
  });

  it("dedupes events across hosts and aggregates dashboard rollups", async () => {
    const host = await loadPlugin({
      sdk: {
        hosts: {
          list: async () => [
            {
              id: "host-a",
              name: "Alpha",
              status: "connected",
            },
            {
              id: "host-b",
              name: "Beta",
              status: "connected",
            },
          ],
        },
      },
      callRetryableOnlineRpc: scanHosts,
    });

    const refresh = await host.harness.callRpc("refreshUsage", {
      sinceDays: null,
    });
    expect(refresh).toMatchObject({
      eventsInserted: 2,
      hostsScanned: 2,
    });

    const dashboard = (await host.harness.callRpc("getUsageDashboard", {
      range: "all",
      metric: "cost",
    })) as UsageDashboard;
    expect(dashboard.totalCostUsdMicros).toBe(4_580_000);
    expect(dashboard.totalTokens).toBe(1_100_000);
    expect(dashboard.byProvider).toEqual([
      {
        provider: "claude-code",
        costUsdMicros: 4_500_000,
        tokens: 1_100_000,
        eventCount: 1,
      },
      {
        provider: "cursor",
        costUsdMicros: 80_000,
        tokens: 0,
        eventCount: 1,
      },
    ]);
    expect(dashboard.costQuality).toEqual({
      eventCount: 2,
      pricedEventCount: 2,
      providerReportedCount: 1,
      modelPricedCount: 1,
      unpricedCount: 0,
    });
    expect(dashboard.machines).toEqual([
      {
        hostId: "host-a",
        hostName: "Alpha",
        status: "connected",
        lastScannedAt: "2026-08-10T14:00:00.000Z",
        eventCount: 2,
      },
      {
        hostId: "host-b",
        hostName: "Beta",
        status: "connected",
        lastScannedAt: "2026-08-10T14:00:00.000Z",
        eventCount: 0,
      },
    ]);
  });

  it("skips disconnected hosts during refresh", async () => {
    const host = await loadPlugin({
      sdk: {
        hosts: {
          list: async () => [
            {
              id: "host-offline",
              name: "Offline",
              status: "disconnected",
            },
          ],
        },
      },
      callRetryableOnlineRpc: async () => {
        throw new Error("should not scan disconnected hosts");
      },
    });

    const refresh = await host.harness.callRpc("refreshUsage", {
      sinceDays: 30,
    });
    expect(refresh).toMatchObject({
      hostsScanned: 0,
      hostsSkipped: 1,
      eventsInserted: 0,
    });
  });
});
