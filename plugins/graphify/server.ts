import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { registerGraphifyCli, readGraphStatus } from "./src/cli.js";
import { renderCatalog } from "./src/graph-status.js";
import { resolveProjectSource } from "./src/project-source.js";

export const REALTIME_CHANNEL = "graphify-changed";

export const graphifyRpcContract = defineRpcContract({
  status: {
    input: z
      .object({
        projectId: z.string(),
      })
      .strict(),
    output: z
      .object({
        exists: z.boolean(),
        nodeCount: z.number(),
        edgeCount: z.number(),
        directed: z.boolean(),
        graphPath: z.string(),
        topNodes: z.array(
          z
            .object({
              id: z.string(),
              label: z.string(),
              degree: z.number(),
            })
            .strict(),
        ),
      })
      .strict(),
  },
  listProjects: {
    input: z.null(),
    output: z
      .object({
        projects: z.array(
          z
            .object({
              id: z.string(),
              name: z.string(),
              kind: z.enum(["personal", "standard"]),
              hasSource: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict(),
  },
});

export default async function plugin(bb: BbPluginApi) {
  const catalogByProject = new Map<string, string>();

  async function refreshCatalog(projectId: string): Promise<void> {
    try {
      const source = await resolveProjectSource(bb, projectId);
      const status = await readGraphStatus(bb, source);
      catalogByProject.set(projectId, renderCatalog(status));
    } catch (error) {
      catalogByProject.delete(projectId);
      bb.log.warn(
        `graphify catalog refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  bb.rpc.register(graphifyRpcContract, {
    async listProjects() {
      const projects = await bb.sdk.projects.list({ includePersonal: true });
      return {
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          kind: project.kind,
          hasSource: project.sources.length > 0,
        })),
      };
    },
    async status(input) {
      const source = await resolveProjectSource(bb, input.projectId);
      return readGraphStatus(bb, source);
    },
  });

  bb.agents.contributeInstructions(({ projectId }) => {
    const cached = catalogByProject.get(projectId);
    if (cached) return cached;
    void refreshCatalog(projectId);
    return [
      "Graphify index",
      "Run `bb graphify status` / `bb graphify update` then `bb graphify query \"…\"`.",
      "Before risky edits: `bb graphify affected \"<symbol-or-file>\"`.",
    ].join("\n");
  });

  bb.agents.configure(() => ({
    tools: [],
    skills: ["graphify"],
  }));

  bb.events.on("thread.created", ({ thread }) => {
    void refreshCatalog(thread.projectId);
  });
  bb.events.on("thread.active", ({ thread }) => {
    void refreshCatalog(thread.projectId);
  });

  registerGraphifyCli(bb);
}
