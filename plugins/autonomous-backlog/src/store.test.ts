import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@bb/plugin-sdk/testing";
import { BacklogStore } from "./store.js";

function createFileBackedHost() {
  const files = new Map<string, string>();
  const projectRoot = "/tmp/project";
  const projectId = "proj_test";

  const { bb } = createFakePluginHost({
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
    },
  });

  return { bb, files, projectId, projectRoot };
}

describe("BacklogStore", () => {
  it("seeds TASK-001 and creates incremental tasks", async () => {
    const { bb, projectId } = createFileBackedHost();
    const store = new BacklogStore(bb);

    const seeded = await store.ensureSeed(projectId);
    expect(seeded?.id).toBe("TASK-001");

    const listed = await store.listTasks(projectId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.title).toContain("Autonomous Backlog");

    const created = await store.createTask(
      projectId,
      {
        title: "Add missing tests",
        description: "Cover store conflict handling.",
        priority: "high",
        type: "test_coverage",
        target_files: ["plugins/autonomous-backlog/src/store.ts"],
        suggested_prompt: "Add tests for CAS conflict retries.",
      },
      "th_source",
      "bb-agent",
    );

    expect(created.id).toBe("TASK-002");
    expect(created.source_thread_id).toBe("th_source");

    const completed = await store.completeTask(
      projectId,
      "TASK-002",
      "Added coverage for conflict retries.",
    );
    expect(completed.status).toBe("completed");
    expect(completed.resolution_summary).toContain("coverage");
  });

  it("filters tasks by status and type", async () => {
    const { bb, projectId } = createFileBackedHost();
    const store = new BacklogStore(bb);
    await store.ensureSeed(projectId);
    await store.createTask(
      projectId,
      {
        title: "Refactor panel filters",
        description: "Extract shared filter bar.",
        priority: "low",
        type: "refactor",
        target_files: ["plugins/autonomous-backlog/app.tsx"],
        suggested_prompt: "Refactor the filter bar.",
      },
      "",
      "user",
    );

    const refactors = await store.listTasks(projectId, {
      type: "refactor",
    });
    expect(refactors).toHaveLength(1);
    expect(refactors[0]?.type).toBe("refactor");
  });
});
