import {
  type BbPluginApi,
  type PluginAgentToolResult,
} from "@bb/plugin-sdk";
import { z } from "zod";
import { REALTIME_CHANNEL, rosterRpcContract } from "./contract.js";
import { computeCollaborationGroups } from "./src/collaboration.js";
import { layoutZoneIdToAgentZone } from "./src/spatial.js";
import {
  extractSplits,
  layoutFromSplits,
  updateZoneNames,
} from "./src/layout-editor.js";
import { RosterStore } from "./src/store.js";
import { registerRosterCli } from "./src/cli.js";
import { AGENT_STATUSES } from "./src/types.js";

export { REALTIME_CHANNEL, rosterRpcContract } from "./contract.js";

const agentStatusSchema = z.enum(AGENT_STATUSES);

function toolError(message: string): PluginAgentToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function toolJson(value: unknown): PluginAgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function buildInvokePrompt(
  agent: {
    name: string;
    role: string;
    system_prompt: string;
    allowed_tools: string[];
  },
  userPrompt: string,
  taskId?: string | null,
): string {
  const sections = [
    agent.system_prompt,
    "",
    `## Role: ${agent.role}`,
    `## Permitted tools: ${agent.allowed_tools.join(", ") || "none declared"}`,
  ];
  if (taskId) {
    sections.push("", `## Task reference: ${taskId}`);
  }
  sections.push("", "## User request", userPrompt);
  return sections.join("\n");
}

export default async function plugin(bb: BbPluginApi) {
  const store = new RosterStore(bb);

  function publishChanged(projectId: string): void {
    bb.realtime.publish(REALTIME_CHANNEL, { projectId, at: Date.now() });
  }

  async function invokeAgentThread(args: {
    projectId: string;
    agentId: string;
    prompt: string;
    taskId?: string | null;
    parentThreadId?: string | null;
  }): Promise<{ threadId: string; agent: Awaited<ReturnType<RosterStore["readAgent"]>> }> {
    const agent = await store.readAgent(args.projectId, args.agentId);
    await store.assignAgentToZone(
      args.projectId,
      args.agentId,
      "testing_lab",
    );
    await store.updateAgentSpatial(
      args.projectId,
      args.agentId,
      {
        status: "working",
        current_task_id: args.taskId ?? null,
      },
      {
        active_thread_id: null,
        speech_bubble: `Starting: ${args.prompt.slice(0, 80)}${args.prompt.length > 80 ? "…" : ""}`,
      },
    );
    const title = `[Roster] ${agent.name}: ${args.prompt.slice(0, 60)}`.slice(
      0,
      120,
    );
    const thread = await bb.sdk.threads.spawn({
      projectId: args.projectId,
      environment: { type: "project-default" },
      title,
      prompt: buildInvokePrompt(agent, args.prompt, args.taskId),
      visibility: "hidden",
      ...(args.parentThreadId
        ? { parentThreadId: args.parentThreadId }
        : {}),
    });
    const updated = await store.updateAgentSpatial(
      args.projectId,
      args.agentId,
      { status: "working" },
      { active_thread_id: thread.id },
    );
    await store.appendEvent(args.projectId, {
      message: `${agent.name} assigned to ${args.taskId ?? "ad-hoc task"}`,
      agent_id: agent.id,
    });
    const agents = await store.listAgents(args.projectId);
    const groups = await computeCollaborationGroups(bb, agents);
    if (groups.length > 0) {
      await store.syncCollaborationToConference(args.projectId, groups);
    }
    publishChanged(args.projectId);
    return { threadId: thread.id, agent: updated };
  }

  async function refreshCollaboration(projectId: string): Promise<void> {
    const agents = await store.listAgents(projectId);
    const groups = await computeCollaborationGroups(bb, agents);
    if (groups.length > 0) {
      await store.syncCollaborationToConference(projectId, groups);
    }
  }

  bb.rpc.register(rosterRpcContract, {
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
    async listAgents(input) {
      await store.ensureSeed(input.projectId);
      const agents = await store.listAgents(input.projectId, {
        status: input.status,
        role: input.role,
      });
      const layout = await store.getOfficeLayout(input.projectId);
      const events = await store.listEvents(input.projectId);
      const collaboration_groups = await computeCollaborationGroups(bb, agents);
      const active = agents.filter(
        (agent) =>
          agent.spatial_state.status === "working" ||
          agent.spatial_state.status === "thinking",
      ).length;
      return {
        agents,
        layout,
        events,
        collaboration_groups,
        metrics: { active, total: agents.length },
      };
    },
    async registerAgent(input) {
      const agent = await store.registerAgent(input.projectId, input);
      publishChanged(input.projectId);
      return { agent };
    },
    async updateAgent(input) {
      const agent = await store.updateAgent(input.projectId, input.agentId, {
        name: input.name,
        role: input.role,
        system_prompt: input.system_prompt,
        avatar: input.avatar,
        allowed_tools: input.allowed_tools,
        default_model: input.default_model,
      });
      publishChanged(input.projectId);
      return { agent };
    },
    async archiveAgent(input) {
      const agent = await store.archiveAgent(input.projectId, input.agentId);
      publishChanged(input.projectId);
      return { agent };
    },
    async invokeAgent(input) {
      return invokeAgentThread(input);
    },
    async assignAgentToZone(input) {
      const agent = await store.assignAgentToZone(
        input.projectId,
        input.agentId,
        input.zoneId,
      );
      publishChanged(input.projectId);
      return { agent };
    },
    async moveAgent(input) {
      const layout = await store.getOfficeLayout(input.projectId);
      const zoneId =
        layout.zones.find(
          (zone) =>
            input.position_x >= zone.bounds.x &&
            input.position_x < zone.bounds.x + zone.bounds.width &&
            input.position_y >= zone.bounds.y &&
            input.position_y < zone.bounds.y + zone.bounds.height,
        )?.id ?? "fixed_desks";
      const agentZone = layoutZoneIdToAgentZone(zoneId) ?? "desks";
      const agent = await store.updateAgentSpatial(
        input.projectId,
        input.agentId,
        {
          zone: agentZone,
          position_x: input.position_x,
          position_y: input.position_y,
        },
      );
      publishChanged(input.projectId);
      return { agent };
    },
    async updateAgentPrompt(input) {
      return invokeAgentThread({
        projectId: input.projectId,
        agentId: input.agentId,
        prompt: input.prompt,
        parentThreadId: input.parentThreadId,
      });
    },
    async getFormOptions() {
      const { AVATAR_OPTIONS, MODEL_OPTIONS, TOOL_OPTIONS } = await import(
        "./src/types.js"
      );
      return {
        avatars: [...AVATAR_OPTIONS],
        tools: TOOL_OPTIONS.map((tool) => ({
          id: tool.id,
          label: tool.label,
        })),
        models: [...MODEL_OPTIONS],
      };
    },
    async getOfficeLayout(input) {
      const layout = await store.getOfficeLayout(input.projectId);
      return { layout };
    },
    async saveOfficeLayout(input) {
      const result = await store.applyOfficeLayout(
        input.projectId,
        input.layout,
      );
      publishChanged(input.projectId);
      return result;
    },
    async resetOfficeLayout(input) {
      const result = await store.resetOfficeLayout(input.projectId);
      publishChanged(input.projectId);
      return result;
    },
  });

  bb.agents.registerTool({
    name: "register_roster_agent",
    description:
      "Append a new custom agent profile to .bb/roster/agents.json and place them at an available desk.",
    parameters: z
      .object({
        name: z.string().min(1),
        role: z.string().min(1),
        system_prompt: z.string().min(1),
        avatar: z.string().min(1),
        allowed_tools: z.array(z.string()),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const agent = await store.registerAgent(ctx.projectId, input);
        publishChanged(ctx.projectId);
        return toolJson({ id: agent.id, name: agent.name, zone: agent.spatial_state.zone });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "invoke_roster_agent",
    description:
      "Move a roster agent to the Testing Lab, spawn a background thread with their system prompt, and set status to working.",
    parameters: z
      .object({
        agent_id: z.string().min(1),
        prompt: z.string().min(1),
        task_id: z.string().optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const result = await invokeAgentThread({
          projectId: ctx.projectId,
          agentId: input.agent_id,
          prompt: input.prompt,
          taskId: input.task_id ?? null,
          parentThreadId: ctx.threadId,
        });
        return toolJson({
          thread_id: result.threadId,
          agent_id: result.agent.id,
          status: result.agent.spatial_state.status,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "assign_agent_to_zone",
    description:
      "Update spatial coordinates in .bb/roster/agents.json and reposition the agent sprite.",
    parameters: z
      .object({
        agent_id: z.string().min(1),
        zone_id: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const agent = await store.assignAgentToZone(
          ctx.projectId,
          input.agent_id,
          input.zone_id,
        );
        publishChanged(ctx.projectId);
        return toolJson({
          agent_id: agent.id,
          zone: agent.spatial_state.zone,
          position_x: agent.spatial_state.position_x,
          position_y: agent.spatial_state.position_y,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "list_roster_agents",
    description:
      "Return all registered roster agents and their current spatial states.",
    parameters: z
      .object({
        status: agentStatusSchema.optional(),
        role: z.string().optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const agents = await store.listAgents(ctx.projectId, {
          status: input.status,
          role: input.role,
        });
        return toolJson({ agents });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "update_roster_agent",
    description:
      "Update a roster agent profile in .bb/roster/agents.json. Tool access cannot change while the agent is active.",
    parameters: z
      .object({
        agent_id: z.string().min(1),
        name: z.string().min(1),
        role: z.string().min(1),
        system_prompt: z.string().min(1),
        avatar: z.string().min(1),
        allowed_tools: z.array(z.string()),
        default_model: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const agent = await store.updateAgent(ctx.projectId, input.agent_id, {
          name: input.name,
          role: input.role,
          system_prompt: input.system_prompt,
          avatar: input.avatar,
          allowed_tools: input.allowed_tools,
          default_model: input.default_model,
        });
        publishChanged(ctx.projectId);
        return toolJson({ id: agent.id, name: agent.name });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "archive_roster_agent",
    description:
      "Archive a roster agent by setting status to offline. Active agents cannot be archived.",
    parameters: z
      .object({
        agent_id: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const agent = await store.archiveAgent(ctx.projectId, input.agent_id);
        publishChanged(ctx.projectId);
        return toolJson({ id: agent.id, status: agent.spatial_state.status });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "update_office_layout",
    description:
      "Update .bb/roster/office_layout.json zone splits and names. Grid stays 24×16 with four fixed zones.",
    parameters: z
      .object({
        column_split: z.number().int().optional(),
        row_split: z.number().int().optional(),
        zone_names: z
          .object({
            fixed_desks: z.string().min(1).optional(),
            meeting_room: z.string().min(1).optional(),
            breakout_room: z.string().min(1).optional(),
            testing_lab: z.string().min(1).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const current = await store.getOfficeLayout(ctx.projectId);
        let zones = current.zones;
        if (input.zone_names) {
          zones = updateZoneNames(current, input.zone_names).zones;
        }
        const splits = extractSplits(current);
        const nextLayout = layoutFromSplits(
          input.column_split ?? splits.columnSplit,
          input.row_split ?? splits.rowSplit,
          zones,
        );
        const result = await store.applyOfficeLayout(ctx.projectId, nextLayout);
        publishChanged(ctx.projectId);
        return toolJson({
          layout: result.layout,
          agents_repositioned: result.agentsRepositioned,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.configure(() => ({
    tools: [
      "register_roster_agent",
      "update_roster_agent",
      "archive_roster_agent",
      "invoke_roster_agent",
      "assign_agent_to_zone",
      "list_roster_agents",
      "update_office_layout",
    ],
    skills: ["agent-roster"],
  }));

  registerRosterCli(bb, store, async (args) => {
    const result = await invokeAgentThread({
      projectId: args.projectId,
      agentId: args.agentId,
      prompt: args.prompt,
      taskId: null,
      parentThreadId: null,
    });
    publishChanged(args.projectId);
    return { threadId: result.threadId };
  });

  bb.events.on("thread.active", async ({ thread }) => {
    const agent = await store.findAgentByThread(thread.projectId, thread.id);
    if (!agent) return;
    await store.setAgentStatus(
      thread.projectId,
      agent.id,
      "working",
      "Working…",
    );
    await refreshCollaboration(thread.projectId);
    publishChanged(thread.projectId);
  });

  bb.events.on("thread.idle", async ({ thread, lastAssistantText }) => {
    const agent = await store.findAgentByThread(thread.projectId, thread.id);
    if (!agent) return;
    const summary =
      lastAssistantText?.trim() ||
      `${agent.name} completed without a final message.`;
    await store.updateAgentSpatial(
      thread.projectId,
      agent.id,
      {
        status: "idle",
        current_task_id: null,
      },
      {
        active_thread_id: null,
        speech_bubble: summary.slice(0, 120),
      },
    );
    await store.appendEvent(thread.projectId, {
      message: `${agent.name} completed analysis`,
      agent_id: agent.id,
    });
    publishChanged(thread.projectId);
  });

  bb.events.on("thread.failed", async ({ thread, error }) => {
    const agent = await store.findAgentByThread(thread.projectId, thread.id);
    if (!agent) return;
    await store.updateAgentSpatial(
      thread.projectId,
      agent.id,
      { status: "error" },
      {
        active_thread_id: null,
        speech_bubble: error ?? "Task failed",
      },
    );
    await store.appendEvent(thread.projectId, {
      message: `${agent.name} encountered an error`,
      agent_id: agent.id,
    });
    publishChanged(thread.projectId);
  });
}
