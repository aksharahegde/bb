import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@bb/plugin-sdk/testing";
import { z } from "zod";
import { BacklogStore } from "./store.js";

function createTasksBackedHost() {
  const projectRoot = "/tmp/project";
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
  const labels = new Map<string, { id: string; name: string; projectId: string }>();
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
        return args.outputSchema.parse({
          labels: [...labels.values()].filter(
            (label) => label.projectId === input.projectId,
          ),
        });
      case "createLabel": {
        const id = "01ARZ3NDEKTSV4RRFFQ69G5FBL";
        labels.set(id, {
          id,
          name: String(input.name),
          projectId: String(input.projectId),
        });
        return args.outputSchema.parse({
          label: { id, name: String(input.name) },
        });
      }
      case "listTasks":
        return args.outputSchema.parse({
          tasks: [...tasks.values()].filter(
            (task) => task.projectId === input.projectId,
          ),
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
          title: input.title === undefined ? current.title : String(input.title),
          description:
            input.description === undefined
              ? current.description
              : String(input.description),
          status:
            input.status === undefined ? current.status : String(input.status),
          priority:
            input.priority === undefined
              ? current.priority
              : String(input.priority),
          updatedAt: new Date().toISOString(),
        };
        tasks.set(current.id, updated);
        return args.outputSchema.parse({ ok: true, task: updated });
      }
      case "createComment":
        return args.outputSchema.parse({ comment: { id: "01ARZ3NDEKTSV4RRFFQ69G5FCM" } });
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

  const { bb } = createFakePluginHost({
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
              path: projectRoot,
            },
          ],
        }),
      },
      plugins: {
        callRpc,
      },
      files: {
        read: async () => {
          throw new Error("ENOENT");
        },
        write: async () => {
          throw new Error("JSON writes are deprecated");
        },
        mkdir: async () => undefined,
      },
    },
  });

  return { bb, projectId: bbProjectId, tasks };
}

describe("BacklogStore", () => {
  it("creates and lists tasks through Tasks without writing JSON", async () => {
    const { bb, projectId, tasks } = createTasksBackedHost();
    const store = new BacklogStore(bb);

    expect(await store.ensureSeed(projectId)).toBeNull();

    const created = await store.createTask(
      projectId,
      {
        title: "Add missing tests",
        description: "Cover the store path",
        priority: "high",
        type: "test_coverage",
        target_files: ["src/store.ts"],
        suggested_prompt: "Add tests for createTask",
      },
      "thr_source",
      "bb-agent",
    );

    expect(created.title).toBe("Add missing tests");
    expect(created.status).toBe("backlog");
    expect(created.id).toMatch(/^BL-\d+$/);
    expect(tasks.size).toBe(1);

    const listed = await store.listTasks(projectId, { type: "test_coverage" });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.target_files).toEqual(["src/store.ts"]);
  });

  it("completes tasks and records resolution in Tasks", async () => {
    const { bb, projectId } = createTasksBackedHost();
    const store = new BacklogStore(bb);
    const created = await store.createTask(
      projectId,
      {
        title: "Fix flaky test",
        description: "Stabilize CI",
        priority: "medium",
        type: "bug",
        target_files: [],
        suggested_prompt: "Fix and verify",
      },
      "thr_source",
      "user",
    );
    const completed = await store.completeTask(
      projectId,
      created.id,
      "Fixed timing",
    );
    expect(completed.status).toBe("completed");
    expect(completed.resolution_summary).toBe("Fixed timing");
  });
});
