import { describe, expect, it } from "vitest";
import {
  DEFAULT_OFFICE_LAYOUT,
  findAvailableDesk,
  findZoneAtPosition,
} from "./spatial.js";
import type { RosterAgent } from "./types.js";

function makeAgent(
  overrides: Partial<RosterAgent> & Pick<RosterAgent, "id" | "name">,
): RosterAgent {
  return {
    role: "Debugger",
    avatar: "🐛",
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
    active_since: null,
    speech_bubble: null,
    ...overrides,
  };
}

describe("spatial helpers", () => {
  it("finds zone at grid position", () => {
    expect(findZoneAtPosition(DEFAULT_OFFICE_LAYOUT, 1, 1)).toBe("fixed_desks");
    expect(findZoneAtPosition(DEFAULT_OFFICE_LAYOUT, 14, 1)).toBe("meeting_room");
    expect(findZoneAtPosition(DEFAULT_OFFICE_LAYOUT, 14, 10)).toBe("testing_lab");
  });

  it("places new agents on an unoccupied desk", () => {
    const agents: RosterAgent[] = [
      makeAgent({
        id: "agent-a",
        name: "A",
        spatial_state: {
          zone: "desks",
          position_x: 1,
          position_y: 1,
          status: "idle",
          current_task_id: null,
        },
      }),
    ];
    const desk = findAvailableDesk(DEFAULT_OFFICE_LAYOUT, agents);
    expect(desk.zone).toBe("desks");
    expect(`${desk.position_x},${desk.position_y}`).not.toBe("1,1");
  });
});
