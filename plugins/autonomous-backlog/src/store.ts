import type { BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import {
  hostFileArgs,
  resolveProjectSource,
  tasksFilePath,
} from "./project-source.js";
import {
  type BacklogTask,
  type CreateTaskInput,
  type TaskCreator,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "./types.js";

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

const projectSchema = z
  .object({
    id: z.string(),
    prefix: z.string(),
    linkedBbProjectId: z.string().nullable(),
  })
  .passthrough();

const taskSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    key: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.enum([
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
    ]),
    priority: z.enum(["urgent", "high", "medium", "low", "none"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const listProjectsOutput = z
  .object({ projects: z.array(projectSchema) })
  .strict();
const listTasksOutput = z
  .object({
    tasks: z.array(taskSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .passthrough();
const createProjectOutput = z
  .object({
    project: projectSchema,
  })
  .strict();
const createTaskOutput = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), task: taskSchema }).strict(),
  z
    .object({
      ok: z.literal(false),
      error: z.object({ message: z.string() }).passthrough(),
    })
    .strict(),
]);
const updateTaskOutput = createTaskOutput;
const getTaskByKeyOutput = z
  .object({ task: taskSchema.nullable() })
  .strict();
const getTaskOutput = z.object({ task: taskSchema.nullable() }).strict();
const createCommentOutput = z
  .object({ comment: z.object({ id: z.string() }).passthrough() })
  .passthrough();
const createLabelOutput = z
  .object({ label: z.object({ id: z.string(), name: z.string() }).passthrough() })
  .passthrough();
const listLabelsOutput = z
  .object({
    labels: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  })
  .strict();
const importOutput = z
  .object({
    projectId: z.string(),
    projectKeyPrefix: z.string(),
    imported: z.number(),
    skipped: z.number(),
    createdKeys: z.array(z.string()),
  })
  .strict();
const taskThreadsAttachOutput = z
  .object({ threadId: z.string() })
  .strict();
const listTaskThreadsOutput = z
  .object({
    taskThreads: z.array(
      z
        .object({
          taskId: z.string(),
          threadId: z.string(),
          liveStatus: z.string(),
        })
        .passthrough(),
    ),
  })
  .strict();

const LEGACY_MARKER = "Legacy ID:";
const LABEL_NAME = "autonomous-backlog";

function tasksUnavailable(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    `Tasks plugin required for Autonomous Backlog (install with \`bb plugin install tasks\`): ${message}`,
  );
}

async function callTasks<T>(
  bb: BbPluginApi,
  method: string,
  input: Record<string, string | number | boolean | null | string[]> | null,
  outputSchema: z.ZodType<T>,
): Promise<T> {
  try {
    return await bb.sdk.plugins.callRpc({
      pluginId: "tasks",
      method,
      input: input === null ? null : JSON.parse(JSON.stringify(input)),
      outputSchema,
    });
  } catch (error) {
    throw tasksUnavailable(error);
  }
}

function mapStatusToTasks(status: TaskStatus): string {
  switch (status) {
    case "backlog":
      return "backlog";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "done";
    case "dismissed":
      return "canceled";
  }
}

function mapStatusFromTasks(status: string): TaskStatus {
  switch (status) {
    case "backlog":
    case "todo":
      return "backlog";
    case "in_progress":
    case "in_review":
      return "in_progress";
    case "done":
      return "completed";
    case "canceled":
      return "dismissed";
    default:
      return "backlog";
  }
}

function mapPriorityToTasks(priority: TaskPriority): string {
  switch (priority) {
    case "critical":
      return "urgent";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
  }
}

function mapPriorityFromTasks(priority: string): TaskPriority {
  switch (priority) {
    case "urgent":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function buildDescription(input: {
  description: string;
  type: TaskType;
  created_by: TaskCreator;
  source_thread_id: string;
  suggested_prompt: string;
  target_files: string[];
  legacyId?: string;
  resolution_summary?: string | null;
  assigned_thread_id?: string | null;
}): string {
  const lines = [
    input.description.trim(),
    "",
    "## Autonomous backlog metadata",
  ];
  if (input.legacyId) {
    lines.push(`${LEGACY_MARKER} ${input.legacyId}`);
  }
  lines.push(
    `Type: ${input.type}`,
    `Created by: ${input.created_by}`,
    `Source thread: ${input.source_thread_id || "(none)"}`,
    `Suggested prompt: ${input.suggested_prompt}`,
  );
  if (input.target_files.length > 0) {
    lines.push("Target files:");
    for (const file of input.target_files) {
      lines.push(`- ${file}`);
    }
  }
  if (input.resolution_summary) {
    lines.push(`Resolution: ${input.resolution_summary}`);
  }
  if (input.assigned_thread_id) {
    lines.push(`Assigned thread: ${input.assigned_thread_id}`);
  }
  return `${lines.join("\n").trim()}\n`;
}

function taskFromTasksRow(
  task: z.infer<typeof taskSchema>,
  assignedThreadId: string | null = null,
): BacklogTask {
  const legacy =
    new RegExp(`${LEGACY_MARKER}\\s*(TASK-\\d+)`, "i").exec(task.description)?.[1]
      ?.toUpperCase() ?? task.key;
  const typeMatch = /Type:\s*(\w+)/i.exec(task.description);
  const type = (
    [
      "tech_debt",
      "test_coverage",
      "refactor",
      "bug",
      "security",
    ] as const
  ).includes((typeMatch?.[1] ?? "") as TaskType)
    ? (typeMatch![1] as TaskType)
    : "tech_debt";
  const sourceMatch = /Source thread:\s*(\S+)/i.exec(task.description);
  const promptMatch =
    /Suggested prompt:\s*([\s\S]*?)(?:\nTarget files:|\nResolution:|\nAssigned thread:|$)/i.exec(
      task.description,
    );
  const resolutionMatch =
    /Resolution:\s*([\s\S]*?)(?:\nAssigned thread:|$)/i.exec(task.description);
  const assignedMatch = /Assigned thread:\s*(thr_\S+)/i.exec(task.description);
  const files: string[] = [];
  const filesBlock = /Target files:\n((?:- .+\n?)+)/i.exec(task.description);
  if (filesBlock) {
    for (const line of filesBlock[1]!.split("\n")) {
      const file = line.replace(/^- /, "").trim();
      if (file) files.push(file);
    }
  }
  const body =
    task.description.split("## Autonomous backlog metadata")[0]?.trim() ??
    task.description;
  return {
    id: legacy,
    title: task.title,
    description: body,
    status: mapStatusFromTasks(task.status),
    priority: mapPriorityFromTasks(task.priority),
    type,
    source_thread_id:
      sourceMatch?.[1] && sourceMatch[1] !== "(none)" ? sourceMatch[1] : "",
    target_files: files,
    suggested_prompt: promptMatch?.[1]?.trim() ?? "",
    created_at: task.createdAt,
    created_by: /Created by:\s*bb-agent/i.test(task.description)
      ? "bb-agent"
      : "user",
    assigned_thread_id: assignedThreadId ?? assignedMatch?.[1] ?? null,
    resolution_summary: resolutionMatch?.[1]?.trim() ?? null,
    completed_at: task.status === "done" ? task.updatedAt : null,
  };
}

function matchesFilters(task: BacklogTask, filters: TaskFilters): boolean {
  if (filters.status !== undefined && task.status !== filters.status) {
    return false;
  }
  if (filters.type !== undefined && task.type !== filters.type) {
    return false;
  }
  if (filters.priority !== undefined && task.priority !== filters.priority) {
    return false;
  }
  return true;
}

export class BacklogStore {
  constructor(private readonly bb: BbPluginApi) {}

  private importedProjects = new Set<string>();

  private async ensureImported(bbProjectId: string): Promise<void> {
    if (this.importedProjects.has(bbProjectId)) return;
    try {
      await callTasks(this.bb, "importAutonomousBacklog", {
        bbProjectId,
      }, importOutput);
    } catch {
      // Import is best-effort; create/list still work once a tracker project exists.
    }
    this.importedProjects.add(bbProjectId);
    // Stop dual-writing: leave JSON in place for one release, but do not create it.
  }

  private async resolveTrackerProject(bbProjectId: string): Promise<{
    id: string;
    prefix: string;
  }> {
    await this.ensureImported(bbProjectId);
    const listed = await callTasks(
      this.bb,
      "listProjects",
      {},
      listProjectsOutput,
    );
    const matches = listed.projects.filter(
      (project) => project.linkedBbProjectId === bbProjectId,
    );
    if (matches.length === 1) {
      return { id: matches[0]!.id, prefix: matches[0]!.prefix };
    }
    if (matches.length > 1) {
      throw new Error(
        `multiple Tasks projects linked to ${bbProjectId}; pass an explicit link`,
      );
    }
    const bbProject = await this.bb.sdk.projects.get({ projectId: bbProjectId });
    const used = new Set(
      listed.projects.map((project) => project.prefix.toUpperCase()),
    );
    let prefix = "BL";
    let index = 2;
    while (used.has(prefix)) {
      prefix = `BL${index}`;
      index += 1;
    }
    const created = await callTasks(
      this.bb,
      "createProject",
      {
        name: `${bbProject.name} backlog`,
        prefix,
        color: "#64748b",
        folderId: null,
        linkedBbProjectId: bbProjectId,
      },
      createProjectOutput,
    );
    return { id: created.project.id, prefix: created.project.prefix };
  }

  private async ensureLabel(projectId: string): Promise<string> {
    const labels = await callTasks(
      this.bb,
      "listLabels",
      { projectId },
      listLabelsOutput,
    );
    const existing = labels.labels.find(
      (label) => label.name.toLocaleLowerCase() === LABEL_NAME,
    );
    if (existing) return existing.id;
    const created = await callTasks(
      this.bb,
      "createLabel",
      { projectId, name: LABEL_NAME, color: "#64748b" },
      createLabelOutput,
    );
    return created.label.id;
  }

  private async listTrackerTasks(projectId: string) {
    const tasks: z.infer<typeof taskSchema>[] = [];
    let cursor: string | undefined;
    do {
      const page = await callTasks(
        this.bb,
        "listTasks",
        {
          projectId,
          limit: 500,
          ...(cursor ? { cursor } : {}),
        },
        listTasksOutput,
      );
      tasks.push(...page.tasks);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return tasks;
  }

  private async resolveTaskRow(
    bbProjectId: string,
    id: string,
  ): Promise<z.infer<typeof taskSchema>> {
    const project = await this.resolveTrackerProject(bbProjectId);
    const trimmed = id.trim();
    if (ULID_PATTERN.test(trimmed)) {
      const byId = await callTasks(
        this.bb,
        "getTask",
        { taskId: trimmed },
        getTaskOutput,
      );
      if (byId.task) return byId.task;
    }
    const byKey = await callTasks(
      this.bb,
      "getTaskByKey",
      { taskKey: trimmed },
      getTaskByKeyOutput,
    );
    if (byKey.task) return byKey.task;

    const legacy = trimmed.toUpperCase();
    const tasks = await this.listTrackerTasks(project.id);
    const match = tasks.find((task) => {
      const found = new RegExp(`${LEGACY_MARKER}\\s*(TASK-\\d+)`, "i").exec(
        task.description,
      )?.[1]
        ?.toUpperCase();
      return found === legacy || task.key.toUpperCase() === legacy;
    });
    if (!match) {
      throw new Error(`Task "${id}" was not found`);
    }
    return match;
  }

  async ensureSeed(_projectId: string): Promise<BacklogTask | null> {
    // Seed JSON is no longer written; Tasks owns the queue.
    return null;
  }

  async listTasks(
    projectId: string,
    filters: TaskFilters = {},
  ): Promise<BacklogTask[]> {
    const project = await this.resolveTrackerProject(projectId);
    const rows = await this.listTrackerTasks(project.id);
    return rows
      .map((row) => taskFromTasksRow(row))
      .filter((task) => matchesFilters(task, filters))
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async readTask(projectId: string, id: string): Promise<BacklogTask> {
    const row = await this.resolveTaskRow(projectId, id);
    return taskFromTasksRow(row);
  }

  async createTask(
    projectId: string,
    input: CreateTaskInput,
    sourceThreadId: string,
    createdBy: TaskCreator,
  ): Promise<BacklogTask> {
    const project = await this.resolveTrackerProject(projectId);
    const labelId = await this.ensureLabel(project.id);
    const description = buildDescription({
      description: input.description,
      type: input.type,
      created_by: input.created_by ?? createdBy,
      source_thread_id: input.source_thread_id ?? sourceThreadId,
      suggested_prompt: input.suggested_prompt,
      target_files: input.target_files,
    });
    const result = await callTasks(
      this.bb,
      "createTask",
      {
        projectId: project.id,
        title: input.title.trim(),
        description,
        status: "backlog",
        priority: mapPriorityToTasks(input.priority),
        dueDate: null,
        parentTaskId: null,
        labelIds: [labelId],
      },
      createTaskOutput,
    );
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    return taskFromTasksRow(result.task);
  }

  async updateTaskStatus(
    projectId: string,
    id: string,
    status: TaskStatus,
    assignedThreadId?: string | null,
  ): Promise<BacklogTask> {
    const current = await this.resolveTaskRow(projectId, id);
    const viewed = taskFromTasksRow(current);
    const description = buildDescription({
      description: viewed.description,
      type: viewed.type,
      created_by: viewed.created_by,
      source_thread_id: viewed.source_thread_id,
      suggested_prompt: viewed.suggested_prompt,
      target_files: viewed.target_files,
      legacyId: /^TASK-\d+$/i.test(viewed.id) ? viewed.id : undefined,
      resolution_summary: viewed.resolution_summary,
      assigned_thread_id:
        assignedThreadId === undefined
          ? viewed.assigned_thread_id
          : assignedThreadId,
    });
    const result = await callTasks(
      this.bb,
      "updateTask",
      {
        taskId: current.id,
        status: mapStatusToTasks(status),
        description,
        authorName: "Autonomous Backlog",
      },
      updateTaskOutput,
    );
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    if (assignedThreadId) {
      try {
        await callTasks(
          this.bb,
          "taskThreadsAttach",
          { taskId: current.id, threadId: assignedThreadId },
          taskThreadsAttachOutput,
        );
      } catch {
        // Attach is best-effort when delegation RPC is unavailable.
      }
    }
    return taskFromTasksRow(
      result.task,
      assignedThreadId === undefined
        ? viewed.assigned_thread_id
        : assignedThreadId,
    );
  }

  async updateTask(
    projectId: string,
    id: string,
    patch: Partial<
      Pick<
        BacklogTask,
        | "title"
        | "description"
        | "priority"
        | "type"
        | "target_files"
        | "suggested_prompt"
      >
    >,
  ): Promise<BacklogTask> {
    const current = await this.resolveTaskRow(projectId, id);
    const viewed = taskFromTasksRow(current);
    const next: BacklogTask = {
      ...viewed,
      ...patch,
      title: patch.title?.trim() ?? viewed.title,
      description: patch.description?.trim() ?? viewed.description,
      suggested_prompt:
        patch.suggested_prompt?.trim() ?? viewed.suggested_prompt,
      target_files:
        patch.target_files?.map((file) => file.trim()).filter(Boolean) ??
        viewed.target_files,
    };
    const description = buildDescription({
      description: next.description,
      type: next.type,
      created_by: next.created_by,
      source_thread_id: next.source_thread_id,
      suggested_prompt: next.suggested_prompt,
      target_files: next.target_files,
      legacyId: /^TASK-\d+$/i.test(next.id) ? next.id : undefined,
      resolution_summary: next.resolution_summary,
      assigned_thread_id: next.assigned_thread_id,
    });
    const result = await callTasks(
      this.bb,
      "updateTask",
      {
        taskId: current.id,
        title: next.title,
        description,
        priority: mapPriorityToTasks(next.priority),
        authorName: "Autonomous Backlog",
      },
      updateTaskOutput,
    );
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    return taskFromTasksRow(result.task, next.assigned_thread_id);
  }

  async completeTask(
    projectId: string,
    id: string,
    resolutionSummary: string,
  ): Promise<BacklogTask> {
    const current = await this.resolveTaskRow(projectId, id);
    const viewed = taskFromTasksRow(current);
    const description = buildDescription({
      description: viewed.description,
      type: viewed.type,
      created_by: viewed.created_by,
      source_thread_id: viewed.source_thread_id,
      suggested_prompt: viewed.suggested_prompt,
      target_files: viewed.target_files,
      legacyId: /^TASK-\d+$/i.test(viewed.id) ? viewed.id : undefined,
      resolution_summary: resolutionSummary.trim(),
      assigned_thread_id: viewed.assigned_thread_id,
    });
    const result = await callTasks(
      this.bb,
      "updateTask",
      {
        taskId: current.id,
        status: "done",
        description,
        authorName: "Autonomous Backlog",
      },
      updateTaskOutput,
    );
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    try {
      await callTasks(
        this.bb,
        "createComment",
        {
          taskId: current.id,
          body: `Resolved: ${resolutionSummary.trim()}`,
          notify: false,
        },
        createCommentOutput,
      );
    } catch {
      // Comment is best-effort.
    }
    return taskFromTasksRow(result.task, viewed.assigned_thread_id);
  }

  async findTaskByAssignedThread(
    projectId: string,
    threadId: string,
  ): Promise<BacklogTask | null> {
    const project = await this.resolveTrackerProject(projectId);
    const rows = await this.listTrackerTasks(project.id);
    for (const row of rows) {
      if (mapStatusFromTasks(row.status) !== "in_progress") continue;
      try {
        const threads = await callTasks(
          this.bb,
          "listTaskThreads",
          { taskId: row.id },
          listTaskThreadsOutput,
        );
        if (threads.taskThreads.some((entry) => entry.threadId === threadId)) {
          return taskFromTasksRow(row, threadId);
        }
      } catch {
        // Fall through to description metadata.
      }
      const viewed = taskFromTasksRow(row);
      if (viewed.assigned_thread_id === threadId) {
        return viewed;
      }
    }
    return null;
  }

  /** Read-only helper for tests / diagnostics; does not write JSON. */
  async peekLegacyJson(projectId: string): Promise<string | null> {
    try {
      const source = await resolveProjectSource(this.bb, projectId);
      const file = await this.bb.sdk.files.read({
        ...hostFileArgs(source),
        path: tasksFilePath(source),
      });
      return file.contentEncoding === "utf8" ? file.content : null;
    } catch {
      return null;
    }
  }
}
