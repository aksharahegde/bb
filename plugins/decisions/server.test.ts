import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server.js";

describe("decisions plugin", () => {
  it("registers agent tools and rpc methods", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "decisions" });
    await plugin(bb);

    expect(harness.registrations.agentTools.map((tool) => tool.name)).toEqual([
      "create_decision",
      "search_decisions",
      "read_decision",
      "update_decision_status",
    ]);
    expect(harness.registrations.rpcMethods).toEqual([
      "listProjects",
      "listDecisions",
      "readDecision",
      "createDecision",
      "updateDecisionStatus",
      "saveDecision",
      "spawnAdrThread",
    ]);
    expect(harness.registrations.cli?.name).toBe("decisions");
  });
});
