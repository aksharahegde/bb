import { describe, expect, it } from "vitest";
import { createFakePluginHost, makeThreadResponse } from "@bb/plugin-sdk/testing";
import plugin from "./server.js";

describe("autonomous-backlog plugin", () => {
  it("registers agent tools and rpc methods", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "autonomous-backlog" });
    await plugin(bb);

    expect(harness.registrations.agentTools.map((tool) => tool.name)).toEqual([
      "create_task",
      "list_tasks",
      "update_task_status",
      "complete_task",
    ]);
    expect(harness.registrations.rpcMethods).toEqual([
      "listProjects",
      "listTasks",
      "readTask",
      "createTask",
      "updateTask",
      "updateTaskStatus",
      "dispatchTask",
    ]);
  });

  it("auto-completes dispatched tasks when the assigned thread goes idle", async () => {
    const files = new Map<string, string>();
    const projectRoot = "/tmp/project";
    const projectId = "proj_test";

    const { bb, harness } = createFakePluginHost({
      pluginId: "autonomous-backlog",
      sdk: {
        projects: {
          get: async () => ({
            id: projectId,
            kind: "standard",
            name: "Test",
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
          spawn: async () => ({ id: "th_dispatch" }),
        },
      },
    });

    await plugin(bb);

    await harness.behavior.callRpc("dispatchTask", {
      projectId,
      id: "TASK-001",
      parentThreadId: null,
    });

    await harness.behavior.emitThreadEvent("thread.idle", {
      thread: makeThreadResponse({ id: "th_dispatch", projectId }),
      lastAssistantText: "Finished the backlog verification.",
    });

    const result = await harness.behavior.callRpc("readTask", {
      projectId,
      id: "TASK-001",
    });
    const task = (result as { task: { status: string; resolution_summary: string } }).task;
    expect(task.status).toBe("completed");
    expect(task.resolution_summary).toContain("Finished the backlog verification");
  });
});
