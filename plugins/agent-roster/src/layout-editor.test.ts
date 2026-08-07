import { describe, expect, it } from "vitest";
import {
  extractSplits,
  layoutFromSplits,
  reconcileAgentPositions,
  validateOfficeLayout,
  validateSplits,
} from "./layout-editor.js";
import { DEFAULT_OFFICE_LAYOUT } from "./spatial.js";
import type { RosterAgent } from "./types.js";

function makeAgent(
  overrides: Partial<RosterAgent> & Pick<RosterAgent, "id">,
): RosterAgent {
  return {
    name: overrides.id,
    role: "Debugger",
    avatar: "🤖",
    system_prompt: "test",
    allowed_tools: [],
    default_model: "claude-sonnet-5-thinking-high",
    spatial_state: {
      zone: "desks",
      position_x: 1,
      position_y: 1,
      status: "idle",
      current_task_id: null,
    },
    created_at: new Date().toISOString(),
    active_thread_id: null,
    speech_bubble: null,
    active_since: null,
    ...overrides,
  };
}

describe("layout editor", () => {
  it("builds a tiled layout from splits", () => {
    const layout = layoutFromSplits(10, 6, DEFAULT_OFFICE_LAYOUT.zones);
    expect(extractSplits(layout)).toEqual({ columnSplit: 10, rowSplit: 6 });
    expect(validateOfficeLayout(layout)).toBeNull();
  });

  it("rejects invalid splits", () => {
    expect(validateSplits(2, 8)).toMatch(/column/i);
    expect(validateSplits(12, 20)).toMatch(/row/i);
  });

  it("repositions agents outside shrunken zones", () => {
    const layout = layoutFromSplits(8, 6, DEFAULT_OFFICE_LAYOUT.zones);
    const agents = [
      makeAgent({
        id: "agent-a",
        spatial_state: {
          zone: "desks",
          position_x: 11,
          position_y: 1,
          status: "idle",
          current_task_id: null,
        },
      }),
    ];
    const updates = reconcileAgentPositions(layout, agents);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.spatial.position_x).toBeLessThan(8);
  });

  it("skips offline agents during reconciliation", () => {
    const layout = layoutFromSplits(8, 6, DEFAULT_OFFICE_LAYOUT.zones);
    const agents = [
      makeAgent({
        id: "agent-a",
        spatial_state: {
          zone: "desks",
          position_x: 20,
          position_y: 1,
          status: "offline",
          current_task_id: null,
        },
      }),
    ];
    expect(reconcileAgentPositions(layout, agents)).toEqual([]);
  });
});
