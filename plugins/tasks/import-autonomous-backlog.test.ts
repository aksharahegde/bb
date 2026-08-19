import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@bb/plugin-sdk/testing";
import { createStore } from "./api";
import {
  buildImportedDescription,
  extractLegacyId,
  importAutonomousBacklogForBbProject,
  mapBacklogStatusToTasks,
  parseAutonomousBacklogDocument,
} from "./import-autonomous-backlog";

describe("import-autonomous-backlog", () => {
  it("maps statuses and preserves legacy ids in descriptions", () => {
    expect(mapBacklogStatusToTasks("completed")).toBe("done");
    expect(mapBacklogStatusToTasks("dismissed")).toBe("canceled");
    const description = buildImportedDescription({
      id: "TASK-002",
      title: "Cover edge case",
      description: "Missed null path",
      status: "backlog",
      priority: "high",
      type: "tech_debt",
      source_thread_id: "thr_abc",
      target_files: ["a.ts"],
      suggested_prompt: "Add a guard",
      created_at: new Date().toISOString(),
      created_by: "bb-agent",
      assigned_thread_id: null,
      resolution_summary: null,
      completed_at: null,
    });
    expect(extractLegacyId(description)).toBe("TASK-002");
    expect(description).toContain("a.ts");
  });

  it("imports tasks.json into a linked Tasks project", async () => {
    const files = new Map<string, string>();
    const projectRoot = "/tmp/project";
    const bbProjectId = "proj_test";
    files.set(
      `${projectRoot}/.bb/tasks/tasks.json`,
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: "TASK-001",
            title: "Seed debt",
            description: "From JSON",
            status: "backlog",
            priority: "medium",
            type: "tech_debt",
            source_thread_id: "",
            target_files: [],
            suggested_prompt: "Clean up",
            created_at: new Date().toISOString(),
            created_by: "user",
            assigned_thread_id: null,
            resolution_summary: null,
            completed_at: null,
          },
        ],
      }),
    );

    const { bb } = createFakePluginHost({
      pluginId: "tasks",
      sdk: {
        projects: {
          get: async () => ({
            id: bbProjectId,
            kind: "standard",
            name: "Demo",
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
        },
      },
    });

    const store = createStore(bb);
    const first = await importAutonomousBacklogForBbProject({
      bb,
      store,
      bbProjectId,
    });
    expect(first.imported).toBe(1);
    expect(first.createdKeys[0]).toMatch(/^BL-\d+$/);

    const second = await importAutonomousBacklogForBbProject({
      bb,
      store,
      bbProjectId,
    });
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);

    const doc = parseAutonomousBacklogDocument(
      files.get(`${projectRoot}/.bb/tasks/tasks.json`)!,
    );
    expect(doc.tasks).toHaveLength(1);
  });
});
