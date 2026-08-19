import { describe, expect, it } from "vitest";
import { createFakePluginHost, makeThreadResponse } from "@get-bb/plugin-sdk/testing";
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
    const bbProjectId = "proj_test";
    const tasksProjectId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
    let nextNumber = 1;
    const tasks = new Map<
      string,
      {
        id: string;
        projectId: string;
        key: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        createdAt: string;
        updatedAt: string;
      }
    >();
    const threadLinks = new Map<string, string[]>();

    async function callRpc(args: {
      pluginId: string;
      method: string;
      input?: unknown;
      outputSchema: z.ZodType<unknown>;
    }) {
      expect(args.pluginId).toBe("tasks");
      const input = (args.input ?? {}) as Record<string, unknown>;
      switch (args.method) {
        case "importAutonomousBacklog":
          return args.outputSchema.parse({
            projectId: tasksProjectId,
            projectKeyPrefix: "BL",
            imported: 0,
            skipped: 0,
            createdKeys: [],
          });
        case "listProjects":
          return args.outputSchema.parse({
            projects: [
              {
                id: tasksProjectId,
                prefix: "BL",
                linkedBbProjectId: bbProjectId,
              },
            ],
          });
        case "listLabels":
          return args.outputSchema.parse({ labels: [] });
        case "createLabel":
          return args.outputSchema.parse({
            label: { id: "01ARZ3NDEKTSV4RRFFQ69G5FBL", name: "autonomous-backlog" },
          });
        case "listTasks":
          return args.outputSchema.parse({
            tasks: [...tasks.values()],
            nextCursor: null,
          });
        case "createTask": {
          const id = `01ARZ3NDEKTSV4RRFFQ69G5F${String(nextNumber).padStart(2, "0")}`;
          const key = `BL-${nextNumber}`;
          nextNumber += 1;
          const now = new Date().toISOString();
          const task = {
            id,
            projectId: String(input.projectId),
            key,
            title: String(input.title),
            description: String(input.description ?? ""),
            status: String(input.status ?? "backlog"),
            priority: String(input.priority ?? "medium"),
            createdAt: now,
            updatedAt: now,
          };
          tasks.set(id, task);
          return args.outputSchema.parse({ ok: true, task });
        }
        case "getTask":
          return args.outputSchema.parse({
            task: tasks.get(String(input.taskId)) ?? null,
          });
        case "getTaskByKey": {
          const key = String(input.taskKey).toUpperCase();
          const task =
            [...tasks.values()].find((row) => row.key.toUpperCase() === key) ??
            null;
          return args.outputSchema.parse({ task });
        }
        case "updateTask": {
          const current = tasks.get(String(input.taskId));
          if (!current) {
            return args.outputSchema.parse({
              ok: false,
              error: { message: "not found", code: "project_not_empty" },
            });
          }
          const updated = {
            ...current,
            description:
              input.description === undefined
                ? current.description
                : String(input.description),
            status:
              input.status === undefined ? current.status : String(input.status),
            updatedAt: new Date().toISOString(),
          };
          tasks.set(current.id, updated);
          return args.outputSchema.parse({ ok: true, task: updated });
        }
        case "createComment":
          return args.outputSchema.parse({
            comment: { id: "01ARZ3NDEKTSV4RRFFQ69G5FCM" },
          });
        case "taskThreadsAttach": {
          const list = threadLinks.get(String(input.taskId)) ?? [];
          list.push(String(input.threadId));
          threadLinks.set(String(input.taskId), list);
          return args.outputSchema.parse({ threadId: String(input.threadId) });
        }
        case "listTaskThreads":
          return args.outputSchema.parse({
            taskThreads: (threadLinks.get(String(input.taskId)) ?? []).map(
              (threadId) => ({
                taskId: String(input.taskId),
                threadId,
                liveStatus: "working",
              }),
            ),
          });
        default:
          throw new Error(`unexpected rpc ${args.method}`);
      }
    }

    const { bb, harness } = createFakePluginHost({
      pluginId: "autonomous-backlog",
      sdk: {
        projects: {
          get: async () => ({
            id: bbProjectId,
            kind: "standard",
            name: "Test",
            gitRemoteUrl: null,
            createdAt: 0,
            updatedAt: 0,
            sources: [
              {
                id: "src_1",
                projectId: bbProjectId,
                isDefault: true,
                createdAt: 0,
                updatedAt: 0,
                type: "local_path",
                hostId: "host_1",
                path: "/tmp/project",
              },
            ],
          }),
          list: async () => [
            {
              id: bbProjectId,
              kind: "standard",
              name: "Test",
              gitRemoteUrl: null,
              createdAt: 0,
              updatedAt: 0,
              sources: [],
            },
          ],
        },
        plugins: { callRpc },
        threads: {
          spawn: async () => ({ id: "thr_dispatch" }),
        },
      },
    });

    await plugin(bb);

    const created = await harness.behavior.callRpc("createTask", {
      projectId: bbProjectId,
      title: "Verify dispatch",
      description: "Dispatch then idle",
      priority: "medium",
      type: "tech_debt",
      target_files: [],
      suggested_prompt: "Do the work",
    });
    const taskId = (created as { task: { id: string } }).task.id;

    await harness.behavior.callRpc("dispatchTask", {
      projectId: bbProjectId,
      id: taskId,
      parentThreadId: null,
    });

    await harness.behavior.emitThreadEvent("thread.idle", {
      thread: makeThreadResponse({ id: "thr_dispatch", projectId: bbProjectId }),
      lastAssistantText: "Finished the backlog verification.",
    });

    const result = await harness.behavior.callRpc("readTask", {
      projectId: bbProjectId,
      id: taskId,
    });
    const task = (
      result as { task: { status: string; resolution_summary: string | null } }
    ).task;
    expect(task.status).toBe("completed");
    expect(task.resolution_summary).toContain(
      "Finished the backlog verification",
    );
  });
});
