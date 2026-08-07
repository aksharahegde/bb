import { describe, expect, it } from "vitest";
import {
  assertAgentArchivable,
  assertToolChangesAllowed,
  isAgentActive,
} from "./lifecycle.js";
import type { RosterAgent } from "./types.js";

function makeAgent(
  overrides: Partial<RosterAgent> = {},
): RosterAgent {
  return {
    id: "agent-a",
    name: "Agent A",
    role: "Debugger",
    avatar: "🤖",
    system_prompt: "test",
    allowed_tools: ["read_file"],
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

describe("lifecycle helpers", () => {
  it("detects active agents", () => {
    expect(isAgentActive(makeAgent())).toBe(false);
    expect(
      isAgentActive(
        makeAgent({
          spatial_state: {
            zone: "testing_lab",
            position_x: 1,
            position_y: 1,
            status: "working",
            current_task_id: null,
          },
        }),
      ),
    ).toBe(true);
  });

  it("blocks tool changes for active agents", () => {
    const agent = makeAgent({
      spatial_state: {
        zone: "testing_lab",
        position_x: 1,
        position_y: 1,
        status: "thinking",
        current_task_id: null,
      },
    });
    expect(() =>
      assertToolChangesAllowed(agent, ["read_file", "write_file"]),
    ).toThrow(/tool access/i);
    expect(() => assertToolChangesAllowed(agent, ["read_file"])).not.toThrow();
  });

  it("blocks archiving active agents", () => {
    expect(() => assertAgentArchivable(makeAgent())).not.toThrow();
    expect(() =>
      assertAgentArchivable(
        makeAgent({
          spatial_state: {
            zone: "testing_lab",
            position_x: 1,
            position_y: 1,
            status: "working",
            current_task_id: null,
          },
        }),
      ),
    ).toThrow(/archive/i);
  });
});
