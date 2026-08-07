import { describe, expect, it, vi } from "vitest";
import { createFakePluginHost, makeThreadResponse } from "@bb/plugin-sdk/testing";
import plugin from "./server.js";

function createFileHarness() {
  const files = new Map<string, string>();
  const projectRoot = "/tmp/project";
  const projectId = "proj_roster";

  const { bb, harness } = createFakePluginHost({
    pluginId: "agent-roster",
    sdk: {
      projects: {
        get: async () => ({
          id: projectId,
          kind: "standard",
          name: "Roster Test",
          gitRemoteUrl: null,
          createdAt: 0,
          updatedAt: 0,
          sources: [
            {
              id: "src_1",
              projectId,
              isDefault: true,
              createdAt: 0,
              updatedAt: 0,
              type: "local_path",
              hostId: "host_1",
              path: projectRoot,
            },
          ],
        }),
      },
      files: {
        read: async ({ path }) => {
          const content = files.get(path);
          if (content === undefined) throw new Error(`ENOENT ${path}`);
          return {
            content,
            contentEncoding: "utf8" as const,
            sha256: "hash",
            sizeBytes: content.length,
          };
        },
        write: async ({ path, content }) => {
          if (typeof content !== "string") {
            throw new Error("expected utf8 content");
          }
          files.set(path, content);
          return {
            outcome: "written" as const,
            sha256: "next-hash",
            sizeBytes: content.length,
          };
        },
        mkdir: async () => undefined,
      },
      threads: {
        spawn: async () => makeThreadResponse({ id: "th_roster", projectId }),
        get: async ({ threadId }) =>
          makeThreadResponse({ id: threadId, projectId, parentThreadId: null }),
      },
    },
  });

  return { bb, harness, files, projectId, projectRoot };
}

describe("agent-roster plugin", () => {
  it("registers agent tools, rpc methods, and cli", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "agent-roster" });
    await plugin(bb);

    expect(harness.registrations.agentTools.map((tool) => tool.name)).toEqual([
      "register_roster_agent",
      "invoke_roster_agent",
      "assign_agent_to_zone",
      "list_roster_agents",
      "update_roster_agent",
      "archive_roster_agent",
      "update_office_layout",
    ]);
    expect(harness.registrations.rpcMethods).toContain("listAgents");
    expect(harness.registrations.rpcMethods).toContain("saveOfficeLayout");
    expect(harness.registrations.rpcMethods).toContain("getUsageDisplay");
    expect(harness.registrations.cli?.name).toBe("roster");
  });

  it("creates agents via cli and lists them", async () => {
    const { bb, harness, projectId } = createFileHarness();
    await plugin(bb);

    const created = await harness.runCli(
      [
        "create",
        "--name",
        "CLI Tester",
        "--role",
        "Debugger",
        "--prompt",
        "Test prompt",
        "--project",
        projectId,
        "--json",
      ],
      { projectId },
    );
    expect(created.exitCode).toBe(0);
    const parsed = JSON.parse(created.stdout) as { agent: { id: string } };
    expect(parsed.agent.id).toBeTruthy();

    const listed = await harness.runCli(
      ["list", "--project", projectId, "--json"],
      { projectId },
    );
    expect(listed.exitCode).toBe(0);
    const list = JSON.parse(listed.stdout) as {
      agents: Array<{ name: string }>;
    };
    expect(list.agents.some((agent) => agent.name === "CLI Tester")).toBe(true);
  });

  it("summarizes provider usage via rpc", async () => {
    const { bb, harness } = createFakePluginHost({
      pluginId: "agent-roster",
      sdk: {
        system: {
          usageLimits: async () => ({
            codex: { status: "not_installed" },
            claudeCode: {
              status: "ok",
              accountEmail: null,
              planLabel: "Pro",
              windows: [{ label: "Weekly", usedPercent: 55, resetsAt: null }],
            },
            cursor: { status: "unauthenticated" },
          }),
        },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("getUsageDisplay", null);
    expect(result).toEqual({
      usage: {
        available: true,
        label: "Weekly 55%",
        usedPercent: 55,
      },
    });
  });

  it("rolls back agent state when thread spawn fails", async () => {
    const { bb, harness, projectId } = createFileHarness();
    harness.sdk.stub("threads.spawn", async () => {
      throw new Error("spawn failed");
    });
    await plugin(bb);

    const created = await harness.runCli(
      [
        "create",
        "--name",
        "Worker",
        "--role",
        "Debugger",
        "--prompt",
        "Work",
        "--project",
        projectId,
        "--json",
      ],
      { projectId },
    );
    const agentId = (JSON.parse(created.stdout) as { agent: { id: string } })
      .agent.id;

    const agentsBefore = await harness.behavior.callRpc("listAgents", {
      projectId,
    });
    const before = (
      agentsBefore as {
        agents: Array<{
          id: string;
          spatial_state: { status: string; zone: string };
        }>;
      }
    ).agents.find((agent) => agent.id === agentId)!;

    await expect(
      harness.behavior.callRpc("invokeAgent", {
        projectId,
        agentId,
        prompt: "Do the thing",
      }),
    ).rejects.toThrow("spawn failed");

    const agentsAfter = await harness.behavior.callRpc("listAgents", {
      projectId,
    });
    const after = (
      agentsAfter as {
        agents: Array<{
          id: string;
          spatial_state: { status: string; zone: string };
          active_thread_id: string | null;
        }>;
      }
    ).agents.find((agent) => agent.id === agentId)!;

    expect(after.spatial_state.status).toBe(before.spatial_state.status);
    expect(after.spatial_state.zone).toBe(before.spatial_state.zone);
    expect(after.active_thread_id).toBeNull();
  });

  it("passes default_model when spawning a roster thread", async () => {
    const { bb, harness, projectId } = createFileHarness();
    harness.sdk.stub("threads.spawn", async () =>
      makeThreadResponse({ id: "th_roster", projectId }),
    );
    await plugin(bb);

    const created = await harness.runCli(
      [
        "create",
        "--name",
        "Worker",
        "--role",
        "Debugger",
        "--prompt",
        "Work",
        "--model",
        "composer-2.5-fast",
        "--project",
        projectId,
        "--json",
      ],
      { projectId },
    );
    const agentId = (JSON.parse(created.stdout) as { agent: { id: string } })
      .agent.id;

    await harness.behavior.callRpc("invokeAgent", {
      projectId,
      agentId,
      prompt: "Do the thing",
    });

    const spawnCall = harness.sdk.callsTo("threads.spawn")[0]?.[0] as
      | { model?: string }
      | undefined;
    expect(spawnCall).toEqual(
      expect.objectContaining({ model: "composer-2.5-fast" }),
    );
  });

  it("invokes an agent and returns it to idle on thread.idle", async () => {
    const { bb, harness, projectId } = createFileHarness();
    await plugin(bb);

    const created = await harness.runCli(
      [
        "create",
        "--name",
        "Worker",
        "--role",
        "Debugger",
        "--prompt",
        "Work",
        "--project",
        projectId,
        "--json",
      ],
      { projectId },
    );
    const agentId = (JSON.parse(created.stdout) as { agent: { id: string } })
      .agent.id;

    const invoked = await harness.runCli(
      ["invoke", agentId, "Do the thing", "--project", projectId, "--json"],
      { projectId },
    );
    expect(invoked.exitCode).toBe(0);
    expect(JSON.parse(invoked.stdout)).toEqual({ threadId: "th_roster" });

    const agentsAfterInvoke = await harness.behavior.callRpc("listAgents", {
      projectId,
    });
    const working = (
      agentsAfterInvoke as {
        agents: Array<{ id: string; spatial_state: { status: string } }>;
      }
    ).agents.find((agent) => agent.id === agentId);
    expect(working?.spatial_state.status).toBe("working");

    await harness.behavior.emitThreadEvent("thread.idle", {
      thread: makeThreadResponse({ id: "th_roster", projectId }),
      lastAssistantText: "Done",
    });

    const agentsAfterIdle = await harness.behavior.callRpc("listAgents", {
      projectId,
    });
    const idle = (
      agentsAfterIdle as {
        agents: Array<{
          id: string;
          spatial_state: { status: string; zone: string };
        }>;
      }
    ).agents.find((agent) => agent.id === agentId);
    expect(idle?.spatial_state.status).toBe("idle");
    expect(idle?.spatial_state.zone).toBe("desks");
  });

  it("rejects invoking an agent that is already active", async () => {
    const { bb, harness, projectId } = createFileHarness();
    await plugin(bb);

    const created = await harness.runCli(
      [
        "create",
        "--name",
        "Worker",
        "--role",
        "Debugger",
        "--prompt",
        "Work",
        "--project",
        projectId,
        "--json",
      ],
      { projectId },
    );
    const agentId = (JSON.parse(created.stdout) as { agent: { id: string } })
      .agent.id;

    await harness.behavior.callRpc("invokeAgent", {
      projectId,
      agentId,
      prompt: "First task",
    });

    await expect(
      harness.behavior.callRpc("invokeAgent", {
        projectId,
        agentId,
        prompt: "Second task",
      }),
    ).rejects.toThrow(/already running/i);
  });
});
