import { describe, expect, it, vi } from "vitest";
import { computeCollaborationGroups } from "./collaboration.js";
import type { BbPluginApi } from "@bb/plugin-sdk";
import type { RosterAgent } from "./types.js";

function makeAgent(
  overrides: Partial<RosterAgent> & Pick<RosterAgent, "id" | "active_thread_id">,
): RosterAgent {
  return {
    name: overrides.id,
    role: "Debugger",
    avatar: "default-m",
    system_prompt: "test",
    allowed_tools: [],
    default_model: "claude-sonnet-5-thinking-high",
    spatial_state: {
      zone: "desks",
      position_x: 1,
      position_y: 1,
      status: "working",
      current_task_id: null,
    },
    created_at: new Date().toISOString(),
    speech_bubble: null,
    active_since: new Date().toISOString(),
    ...overrides,
  };
}

function mockBb(
  threads: Record<string, { parentThreadId: string | null }>,
): BbPluginApi {
  return {
    sdk: {
      threads: {
        get: vi.fn(async ({ threadId }: { threadId: string }) => ({
          id: threadId,
          parentThreadId: threads[threadId]?.parentThreadId ?? null,
        })),
      },
    },
  } as unknown as BbPluginApi;
}

describe("computeCollaborationGroups", () => {
  it("returns empty when fewer than two active agents", async () => {
    const agents = [
      makeAgent({ id: "a", active_thread_id: "thread-1" }),
      makeAgent({
        id: "b",
        active_thread_id: "thread-2",
        spatial_state: {
          zone: "desks",
          position_x: 2,
          position_y: 1,
          status: "idle",
          current_task_id: null,
        },
      }),
    ];
    const groups = await computeCollaborationGroups(mockBb({}), agents);
    expect(groups).toEqual([]);
  });

  it("groups agents sharing the same parent thread", async () => {
    const agents = [
      makeAgent({ id: "a", active_thread_id: "thread-a" }),
      makeAgent({
        id: "b",
        active_thread_id: "thread-b",
        spatial_state: {
          zone: "conference_room",
          position_x: 14,
          position_y: 2,
          status: "working",
          current_task_id: null,
        },
      }),
    ];
    const bb = mockBb({
      "thread-a": { parentThreadId: "parent-1" },
      "thread-b": { parentThreadId: "parent-1" },
    });
    const groups = await computeCollaborationGroups(bb, agents);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.thread_id).toBe("parent-1");
    expect(groups[0]?.agent_ids.sort()).toEqual(["a", "b"]);
  });

  it("groups agents on the same active thread when no parent", async () => {
    const agents = [
      makeAgent({ id: "a", active_thread_id: "shared-thread" }),
      makeAgent({
        id: "b",
        active_thread_id: "shared-thread",
        spatial_state: {
          zone: "testing_lab",
          position_x: 14,
          position_y: 10,
          status: "thinking",
          current_task_id: null,
        },
      }),
    ];
    const bb = mockBb({
      "shared-thread": { parentThreadId: null },
    });
    const groups = await computeCollaborationGroups(bb, agents);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.thread_id).toBe("shared-thread");
    expect(groups[0]?.agent_ids.sort()).toEqual(["a", "b"]);
  });

  it("does not group agents with unrelated threads", async () => {
    const agents = [
      makeAgent({ id: "a", active_thread_id: "thread-a" }),
      makeAgent({
        id: "b",
        active_thread_id: "thread-b",
        spatial_state: {
          zone: "desks",
          position_x: 3,
          position_y: 1,
          status: "working",
          current_task_id: null,
        },
      }),
    ];
    const bb = mockBb({
      "thread-a": { parentThreadId: "parent-1" },
      "thread-b": { parentThreadId: "parent-2" },
    });
    const groups = await computeCollaborationGroups(bb, agents);
    expect(groups).toEqual([]);
  });

  it("ignores agents without an active thread", async () => {
    const agents = [
      makeAgent({ id: "a", active_thread_id: "thread-a" }),
      makeAgent({
        id: "b",
        active_thread_id: null,
        spatial_state: {
          zone: "desks",
          position_x: 3,
          position_y: 1,
          status: "working",
          current_task_id: null,
        },
      }),
    ];
    const groups = await computeCollaborationGroups(mockBb({}), agents);
    expect(groups).toEqual([]);
  });
});
