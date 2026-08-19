import {
  defineRpcContract,
  type BbPluginApi,
  type PluginAgentToolResult,
} from "@get-bb/plugin-sdk";
import { z } from "zod";
import { BacklogStore } from "./src/store.js";
import {
  TASK_CREATORS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type BacklogTask,
} from "./src/types.js";

const taskStatusSchema = z.enum(TASK_STATUSES);
const taskPrioritySchema = z.enum(TASK_PRIORITIES);
const taskTypeSchema = z.enum(TASK_TYPES);
const taskCreatorSchema = z.enum(TASK_CREATORS);

const backlogTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    type: taskTypeSchema,
    source_thread_id: z.string(),
    target_files: z.array(z.string()),
    suggested_prompt: z.string(),
    created_at: z.string(),
    created_by: taskCreatorSchema,
    assigned_thread_id: z.string().nullable(),
    resolution_summary: z.string().nullable(),
    completed_at: z.string().nullable(),
  })
  .strict();

export const backlogRpcContract = defineRpcContract({
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
  listTasks: {
    input: z
      .object({
        projectId: z.string(),
        status: taskStatusSchema.optional(),
        type: taskTypeSchema.optional(),
        priority: taskPrioritySchema.optional(),
      })
      .strict(),
    output: z
      .object({
        tasks: z.array(backlogTaskSchema),
        counts: z
          .object({
            backlog: z.number(),
            in_progress: z.number(),
            completed: z.number(),
            dismissed: z.number(),
          })
          .strict(),
      })
      .strict(),
  },
  readTask: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
      })
      .strict(),
    output: z.object({ task: backlogTaskSchema }).strict(),
  },
  createTask: {
    input: z
      .object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        priority: taskPrioritySchema,
        type: taskTypeSchema,
        target_files: z.array(z.string()),
        suggested_prompt: z.string().min(1),
        source_thread_id: z.string().optional(),
      })
      .strict(),
    output: z.object({ task: backlogTaskSchema }).strict(),
  },
  updateTask: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        priority: taskPrioritySchema.optional(),
        type: taskTypeSchema.optional(),
        target_files: z.array(z.string()).optional(),
        suggested_prompt: z.string().min(1).optional(),
      })
      .strict(),
    output: z.object({ task: backlogTaskSchema }).strict(),
  },
  updateTaskStatus: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        status: taskStatusSchema,
        assigned_thread_id: z.string().nullable().optional(),
      })
      .strict(),
    output: z.object({ task: backlogTaskSchema }).strict(),
  },
  dispatchTask: {
    input: z
      .object({
        projectId: z.string(),
        id: z.string(),
        parentThreadId: z.string().nullable(),
      })
      .strict(),
    output: z.object({ threadId: z.string(), task: backlogTaskSchema }).strict(),
  },
});

export const REALTIME_CHANNEL = "autonomous-backlog-changed";

const PASSIVE_DISCOVERY_INSTRUCTIONS =
  "[Autonomous Backlog Hook: While completing primary tasks, if you discover unhandled edge cases, missing test coverage, or obvious tech debt in touched files, call create_task to log them into the Autonomous Backlog without interrupting your main objective unless strictly necessary.]";

function toolError(message: string): PluginAgentToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function toolJson(value: unknown): PluginAgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function taskCounts(tasks: BacklogTask[]) {
  return {
    backlog: tasks.filter((task) => task.status === "backlog").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    dismissed: tasks.filter((task) => task.status === "dismissed").length,
  };
}

function buildDispatchPrompt(task: BacklogTask): string {
  const sections = [
    task.suggested_prompt,
    "",
    `## Task ${task.id}: ${task.title}`,
    task.description,
  ];
  if (task.target_files.length > 0) {
    sections.push(
      "",
      "## Relevant files",
      ...task.target_files.map((file) => `- ${file}`),
    );
  }
  sections.push(
    "",
    "When finished, summarize what you changed. The backlog will mark this task complete when this thread resolves.",
  );
  return sections.join("\n");
}

export default async function plugin(bb: BbPluginApi) {
  const store = new BacklogStore(bb);

  function publishChanged(projectId: string): void {
    bb.realtime.publish(REALTIME_CHANNEL, { projectId, at: Date.now() });
  }

  bb.rpc.register(backlogRpcContract, {
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
    async listTasks(input) {
      const allTasks = await store.listTasks(input.projectId);
      const tasks = await store.listTasks(input.projectId, {
        status: input.status,
        type: input.type,
        priority: input.priority,
      });
      return { tasks, counts: taskCounts(allTasks) };
    },
    async readTask(input) {
      return { task: await store.readTask(input.projectId, input.id) };
    },
    async createTask(input) {
      const task = await store.createTask(
        input.projectId,
        input,
        input.source_thread_id ?? "",
        "user",
      );
      publishChanged(input.projectId);
      return { task };
    },
    async updateTask(input) {
      const { projectId, id, ...patch } = input;
      const task = await store.updateTask(projectId, id, patch);
      publishChanged(projectId);
      return { task };
    },
    async updateTaskStatus(input) {
      const task = await store.updateTaskStatus(
        input.projectId,
        input.id,
        input.status,
        input.assigned_thread_id,
      );
      publishChanged(input.projectId);
      return { task };
    },
    async dispatchTask(input) {
      const task = await store.readTask(input.projectId, input.id);
      if (task.status === "completed" || task.status === "dismissed") {
        throw new Error(`Task ${task.id} is already ${task.status}`);
      }
      const title = `[Task] ${task.id}: ${task.title}`.slice(0, 120);
      const prompt = buildDispatchPrompt(task);
      const thread = await bb.sdk.threads.spawn({
        projectId: input.projectId,
        environment: { type: "project-default" },
        title,
        prompt,
        ...(input.parentThreadId
          ? { parentThreadId: input.parentThreadId }
          : {}),
      });
      const updated = await store.updateTaskStatus(
        input.projectId,
        task.id,
        "in_progress",
        thread.id,
      );
      publishChanged(input.projectId);
      return { threadId: thread.id, task: updated };
    },
  });

  bb.agents.registerTool({
    name: "create_task",
    description:
      "Log a discovered tech-debt, test, refactor, bug, or security follow-up into the project's Autonomous Backlog (.bb/tasks/tasks.json).",
    instructions:
      "Use create_task for follow-ups discovered during routine work. Do not block the primary objective unless resolution is strictly necessary.",
    parameters: z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        priority: taskPrioritySchema,
        type: taskTypeSchema,
        target_files: z.array(z.string()),
        suggested_prompt: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const task = await store.createTask(
          ctx.projectId,
          input,
          ctx.threadId,
          "bb-agent",
        );
        publishChanged(ctx.projectId);
        return toolJson({ id: task.id, title: task.title, status: task.status });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "list_tasks",
    description:
      "List Autonomous Backlog tasks for the current project, optionally filtered by status, type, or priority.",
    parameters: z
      .object({
        status: taskStatusSchema.optional(),
        type: taskTypeSchema.optional(),
        priority: taskPrioritySchema.optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const tasks = await store.listTasks(ctx.projectId, input);
        return toolJson({ tasks });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "update_task_status",
    description:
      "Transition an Autonomous Backlog task between backlog, in_progress, completed, or dismissed.",
    parameters: z
      .object({
        id: z.string().min(1),
        status: taskStatusSchema,
        assigned_thread_id: z.string().nullable().optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const task = await store.updateTaskStatus(
          ctx.projectId,
          input.id,
          input.status,
          input.assigned_thread_id,
        );
        publishChanged(ctx.projectId);
        return toolJson({
          id: task.id,
          status: task.status,
          assigned_thread_id: task.assigned_thread_id,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "complete_task",
    description:
      "Mark an Autonomous Backlog task completed and record how it was resolved.",
    parameters: z
      .object({
        id: z.string().min(1),
        resolution_summary: z.string().min(1),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const task = await store.completeTask(
          ctx.projectId,
          input.id,
          input.resolution_summary,
        );
        publishChanged(ctx.projectId);
        return toolJson({
          id: task.id,
          status: task.status,
          resolution_summary: task.resolution_summary,
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.configure(() => ({
    tools: [
      "create_task",
      "list_tasks",
      "update_task_status",
      "complete_task",
    ],
    skills: ["autonomous-backlog"],
    instructions: PASSIVE_DISCOVERY_INSTRUCTIONS,
  }));

  bb.events.on("thread.idle", async ({ thread, lastAssistantText }) => {
    const task = await store.findTaskByAssignedThread(
      thread.projectId,
      thread.id,
    );
    if (!task) return;
    const summary =
      lastAssistantText?.trim() ||
      `Thread ${thread.id} finished without a final assistant message.`;
    try {
      await store.completeTask(thread.projectId, task.id, summary);
      publishChanged(thread.projectId);
    } catch (error) {
      bb.log.warn(
        `autonomous backlog auto-complete failed for ${task.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });
}
