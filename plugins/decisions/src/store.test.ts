import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { DecisionStore } from "./store.js";
import { formatDecisionMarkdown } from "./types.js";

describe("DecisionStore", () => {
  it("creates, lists, reads, and updates ADRs through bb.sdk.files", async () => {
    const files = new Map<string, string>();
    const projectRoot = "/tmp/project";
    const projectId = "proj_test";

    const { bb } = createFakePluginHost({
      pluginId: "decisions",
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
          listPaths: async ({ path }) => ({
            paths: [...files.keys()]
              .filter((filePath) => filePath.startsWith(`${path}/`))
              .map((filePath) => ({
                path: filePath.slice(path.length + 1),
                kind: "file" as const,
              })),
            truncated: false,
          }),
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
            return { outcome: "written" as const, sha256: "hash", sizeBytes: content.length };
          },
          mkdir: async () => undefined,
        },
      },
    });

    const store = new DecisionStore(bb);
    const created = await store.createDecision(
      projectId,
      {
        title: "Use Tailwind CSS v4",
        context: "We need a consistent styling system.",
        choice: "Tailwind CSS v4",
        trade_offs: ["Migration cost"],
        tags: ["ui", "frontend"],
      },
      ["user", "bb-agent"],
    );

    expect(created.id).toBe("ADR-001");
    expect(created.status).toBe("proposed");

    const listed = await store.listDecisions(projectId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.title).toContain("Tailwind");

    const read = await store.readDecision(projectId, "ADR-001");
    expect(read.raw).toContain("Tailwind CSS v4");

    const updated = await store.updateDecisionStatus(
      projectId,
      "ADR-001",
      "accepted",
      null,
    );
    expect(updated.status).toBe("accepted");

    files.set(
      `${projectRoot}/.bb/decisions/ADR-002-next.md`,
      formatDecisionMarkdown(
        {
          id: "ADR-002",
          title: "Use SQLite",
          status: "accepted",
          date: "2026-08-07",
          authors: ["user"],
          tags: ["database"],
          superseded_by: null,
        },
        {
          context: "Need local persistence.",
          choice: "SQLite",
          trade_offs: [],
        },
      ),
    );

    const catalog = await store.renderActiveCatalog(projectId);
    expect(catalog).toContain("ADR-001");
    expect(catalog).toContain("ADR-002");
  });
});
