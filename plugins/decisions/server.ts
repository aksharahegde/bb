import {
  defineRpcContract,
  type BbPluginApi,
  type PluginAgentToolResult,
} from "@bb/plugin-sdk";
import { z } from "zod";
import { registerDecisionsCli } from "./src/cli.js";
import { DecisionStore } from "./src/store.js";
import { DECISION_STATUSES } from "./src/types.js";

const decisionStatusSchema = z.enum(DECISION_STATUSES);

const decisionSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: decisionStatusSchema,
    date: z.string(),
    authors: z.array(z.string()),
    tags: z.array(z.string()),
    superseded_by: z.string().nullable(),
    filename: z.string(),
    snippet: z.string().nullable(),
  })
  .strict();

const decisionRecordSchema = decisionSummarySchema
  .extend({
    body: z.string(),
    raw: z.string(),
  })
  .strict();

export const decisionsRpcContract = defineRpcContract({
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
  listDecisions: {
    input: z
      .object({
        projectId: z.string(),
        query: z.string().optional(),
        tag: z.string().optional(),
        status: decisionStatusSchema.optional(),
      })
      .strict(),
    output: z.object({ decisions: z.array(decisionSummarySchema) }).strict(),
  },
  readDecision: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
      })
      .strict(),
    output: z.object({ decision: decisionRecordSchema }).strict(),
  },
  createDecision: {
    input: z
      .object({
        projectId: z.string(),
        title: z.string().min(1),
        context: z.string().min(1),
        choice: z.string().min(1),
        trade_offs: z.array(z.string()),
        tags: z.array(z.string()),
        status: decisionStatusSchema.optional(),
      })
      .strict(),
    output: z.object({ decision: decisionRecordSchema }).strict(),
  },
  updateDecisionStatus: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        status: decisionStatusSchema,
        superseded_by: z.string().nullable(),
      })
      .strict(),
    output: z.object({ decision: decisionRecordSchema }).strict(),
  },
  saveDecision: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        raw: z.string(),
      })
      .strict(),
    output: z.object({ decision: decisionRecordSchema }).strict(),
  },
  spawnAdrThread: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        parentThreadId: z.string().nullable(),
      })
      .strict(),
    output: z.object({ threadId: z.string() }).strict(),
  },
});

export const REALTIME_CHANNEL = "decisions-changed";

function toolError(message: string): PluginAgentToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function toolJson(value: unknown): PluginAgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export default async function plugin(bb: BbPluginApi) {
  const store = new DecisionStore(bb);
  const catalogByProject = new Map<string, string>();

  async function refreshCatalog(projectId: string): Promise<void> {
    const catalog = await store.renderActiveCatalog(projectId);
    if (catalog === null) {
      catalogByProject.delete(projectId);
      return;
    }
    catalogByProject.set(projectId, catalog);
  }

  function publishChanged(projectId: string): void {
    bb.realtime.publish(REALTIME_CHANNEL, { projectId, at: Date.now() });
    void refreshCatalog(projectId).catch((error) => {
      bb.log.warn(
        `decision catalog refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  bb.rpc.register(decisionsRpcContract, {
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
    async listDecisions(input) {
      return {
        decisions: await store.listDecisions(input.projectId, {
          query: input.query,
          tag: input.tag,
          status: input.status,
        }),
      };
    },
    async readDecision(input) {
      return { decision: await store.readDecision(input.projectId, input.id) };
    },
    async createDecision(input) {
      const decision = await store.createDecision(
        input.projectId,
        {
          title: input.title,
          context: input.context,
          choice: input.choice,
          trade_offs: input.trade_offs,
          tags: input.tags,
          status: input.status,
        },
        ["user", "bb-agent"],
      );
      publishChanged(input.projectId);
      return { decision };
    },
    async updateDecisionStatus(input) {
      const decision = await store.updateDecisionStatus(
        input.projectId,
        input.id,
        input.status,
        input.superseded_by,
      );
      publishChanged(input.projectId);
      return { decision };
    },
    async saveDecision(input) {
      const decision = await store.saveDecisionRaw(
        input.projectId,
        input.id,
        input.raw,
      );
      publishChanged(input.projectId);
      return { decision };
    },
    async spawnAdrThread(input) {
      const decision = await store.readDecision(input.projectId, input.id);
      const prompt = [
        `Review architectural decision ${decision.id}: ${decision.title}`,
        "",
        decision.raw,
        "",
        "Answer questions about this ADR, suggest improvements, or help apply it to the current work.",
      ].join("\n");
      const thread = await bb.sdk.threads.spawn({
        projectId: input.projectId,
        environment: { type: "project-default" },
        title: `${decision.id}: ${decision.title}`.slice(0, 120),
        prompt,
        ...(input.parentThreadId
          ? { parentThreadId: input.parentThreadId }
          : {}),
      });
      return { threadId: thread.id };
    },
  });

  bb.agents.registerTool({
    name: "create_decision",
    description:
      "Create a new architectural decision record (ADR) in the project's .bb/decisions/ log.",
    instructions:
      "When the user agrees to an architectural tradeoff, offer to log it as an ADR before creating one.",
    parameters: z
      .object({
        title: z.string().min(1),
        context: z.string().min(1),
        choice: z.string().min(1),
        trade_offs: z.array(z.string()),
        tags: z.array(z.string()),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const decision = await store.createDecision(
          ctx.projectId,
          input,
          ["user", "bb-agent"],
        );
        publishChanged(ctx.projectId);
        return toolJson({
          id: decision.id,
          title: decision.title,
          status: decision.status,
          filename: decision.filename,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "search_decisions",
    description:
      "Search project architectural decision records by text, tag, or status.",
    parameters: z
      .object({
        query: z.string(),
        tag: z.string().optional(),
        status: decisionStatusSchema.optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const decisions = await store.listDecisions(ctx.projectId, {
          query: input.query,
          tag: input.tag,
          status: input.status,
        });
        return toolJson({ decisions });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "read_decision",
    description: "Read the full content of one project ADR by id.",
    parameters: z
      .object({
        id: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const decision = await store.readDecision(ctx.projectId, input.id);
        return toolJson(decision);
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "update_decision_status",
    description: "Update an ADR status and optionally link a superseding ADR.",
    parameters: z
      .object({
        id: z.string().min(1),
        status: decisionStatusSchema,
        superseded_by: z.string().nullable().optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const decision = await store.updateDecisionStatus(
          ctx.projectId,
          input.id,
          input.status,
          input.superseded_by ?? null,
        );
        publishChanged(ctx.projectId);
        return toolJson({
          id: decision.id,
          status: decision.status,
          superseded_by: decision.superseded_by,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.configure((context) => {
    const catalog = catalogByProject.get(context.project.id);
    return {
      tools: [
        "create_decision",
        "search_decisions",
        "read_decision",
        "update_decision_status",
      ],
      skills: ["decision-log"],
      ...(catalog ? { instructions: catalog } : {}),
    };
  });

  const warmCatalog = (projectId: string | null | undefined) => {
    if (!projectId) return;
    void refreshCatalog(projectId);
  };

  bb.events.on("thread.created", ({ thread }) => warmCatalog(thread.projectId));
  bb.events.on("thread.active", ({ thread }) => warmCatalog(thread.projectId));

  registerDecisionsCli(bb, store);
}
