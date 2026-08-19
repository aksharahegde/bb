import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  AGENT_STATUSES,
  AGENT_ZONES,
  TOOL_OPTIONS,
} from "./src/types.js";

const agentStatusSchema = z.enum(AGENT_STATUSES);
const agentZoneSchema = z.enum(AGENT_ZONES);

const spatialStateSchema = z
  .object({
    zone: agentZoneSchema,
    position_x: z.number().int(),
    position_y: z.number().int(),
    status: agentStatusSchema,
    current_task_id: z.string().nullable(),
  })
  .strict();

const rosterAgentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    avatar: z.string(),
    system_prompt: z.string(),
    allowed_tools: z.array(z.string()),
    default_model: z.string(),
    spatial_state: spatialStateSchema,
    created_at: z.string(),
    active_thread_id: z.string().nullable(),
    speech_bubble: z.string().nullable(),
    active_since: z.string().nullable(),
  })
  .strict();

const collaborationGroupSchema = z
  .object({
    thread_id: z.string(),
    agent_ids: z.array(z.string()),
  })
  .strict();

const officeZoneSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    bounds: z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        width: z.number().int(),
        height: z.number().int(),
      })
      .strict(),
    type: z.enum(["execution", "collaboration", "idle_pool"]),
  })
  .strict();

const officeLayoutSchema = z
  .object({
    grid_dimensions: z
      .object({
        width: z.number().int(),
        height: z.number().int(),
      })
      .strict(),
    zones: z.array(officeZoneSchema),
  })
  .strict();

const rosterEventSchema = z
  .object({
    id: z.string(),
    at: z.string(),
    message: z.string(),
    agent_id: z.string().nullable(),
  })
  .strict();

export const REALTIME_CHANNEL = "agent-roster-changed";

export const rosterRpcContract = defineRpcContract({
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
  listAgents: {
    input: z
      .object({
        projectId: z.string(),
        status: agentStatusSchema.optional(),
        role: z.string().optional(),
      })
      .strict(),
    output: z
      .object({
        agents: z.array(rosterAgentSchema),
        layout: officeLayoutSchema,
        events: z.array(rosterEventSchema),
        metrics: z
          .object({
            active: z.number(),
            total: z.number(),
          })
          .strict(),
        collaboration_groups: z.array(collaborationGroupSchema),
      })
      .strict(),
  },
  registerAgent: {
    input: z
      .object({
        projectId: z.string(),
        name: z.string().min(1),
        role: z.string().min(1),
        system_prompt: z.string().min(1),
        avatar: z.string().min(1),
        allowed_tools: z.array(z.string()),
        default_model: z.string().optional(),
      })
      .strict(),
    output: z.object({ agent: rosterAgentSchema }).strict(),
  },
  invokeAgent: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
        prompt: z.string().min(1),
        taskId: z.string().nullable().optional(),
        parentThreadId: z.string().nullable().optional(),
      })
      .strict(),
    output: z
      .object({
        threadId: z.string(),
        agent: rosterAgentSchema,
      })
      .strict(),
  },
  assignAgentToZone: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
        zoneId: z.string(),
      })
      .strict(),
    output: z.object({ agent: rosterAgentSchema }).strict(),
  },
  moveAgent: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
        position_x: z.number().int(),
        position_y: z.number().int(),
      })
      .strict(),
    output: z.object({ agent: rosterAgentSchema }).strict(),
  },
  updateAgent: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
        name: z.string().min(1),
        role: z.string().min(1),
        system_prompt: z.string().min(1),
        avatar: z.string().min(1),
        allowed_tools: z.array(z.string()),
        default_model: z.string().min(1),
      })
      .strict(),
    output: z.object({ agent: rosterAgentSchema }).strict(),
  },
  archiveAgent: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
      })
      .strict(),
    output: z.object({ agent: rosterAgentSchema }).strict(),
  },
  updateAgentPrompt: {
    input: z
      .object({
        projectId: z.string(),
        agentId: z.string(),
        prompt: z.string().min(1),
        parentThreadId: z.string().nullable().optional(),
      })
      .strict(),
    output: z
      .object({
        threadId: z.string(),
        agent: rosterAgentSchema,
      })
      .strict(),
  },
  getFormOptions: {
    input: z.null(),
    output: z
      .object({
        characterPresets: z.array(
          z
            .object({
              id: z.string(),
              label: z.string(),
            })
            .strict(),
        ),
        tools: z.array(
          z.object({ id: z.string(), label: z.string() }).strict(),
        ),
        models: z.array(z.string()),
      })
      .strict(),
  },
  getOfficeLayout: {
    input: z.object({ projectId: z.string() }).strict(),
    output: z.object({ layout: officeLayoutSchema }).strict(),
  },
  saveOfficeLayout: {
    input: z
      .object({
        projectId: z.string(),
        layout: officeLayoutSchema,
      })
      .strict(),
    output: z
      .object({
        layout: officeLayoutSchema,
        agentsRepositioned: z.number().int(),
      })
      .strict(),
  },
  resetOfficeLayout: {
    input: z.object({ projectId: z.string() }).strict(),
    output: z
      .object({
        layout: officeLayoutSchema,
        agentsRepositioned: z.number().int(),
      })
      .strict(),
  },
  getUsageDisplay: {
    input: z.null(),
    output: z
      .object({
        usage: z
          .object({
            label: z.string(),
            usedPercent: z.number().nullable(),
            available: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  },
});

export type RosterRpcContract = typeof rosterRpcContract;
