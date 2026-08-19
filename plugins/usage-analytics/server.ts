import type { BbPluginApi } from "@get-bb/plugin-sdk";
import {
  REALTIME_CHANNEL,
  usageAnalyticsRpcContract,
} from "./contract.js";
import { buildUsageDashboard } from "./src/dashboard.js";
import { refreshUsageFromHosts } from "./src/refresh.js";
import { UsageStore } from "./src/store.js";

export { REALTIME_CHANNEL, usageAnalyticsRpcContract } from "./contract.js";

export default async function plugin(bb: BbPluginApi) {
  const store = new UsageStore(bb);

  function publishChanged(refreshedAt: string): void {
    bb.realtime.publish(REALTIME_CHANNEL, { refreshedAt, at: Date.now() });
  }

  bb.rpc.register(usageAnalyticsRpcContract, {
    async getUsageDashboard(input) {
      const hosts = await bb.sdk.hosts.list();
      return buildUsageDashboard({
        store,
        range: input.range,
        metric: input.metric,
        hosts,
      });
    },
    async refreshUsage(input) {
      const result = await refreshUsageFromHosts(bb, store, input.sinceDays);
      publishChanged(result.refreshedAt);
      return result;
    },
  });
}
