import type { BbPluginApi } from "@bb/plugin-sdk";
import {
  hostFileArgs,
  resolveProjectSource,
  tasksFilePath,
  type ProjectSource,
} from "./project-source.js";
import {
  createSeedTask,
  nextTaskId,
  type BacklogTask,
  type CreateTaskInput,
  type TaskCreator,
  type TaskFilters,
  type TaskStatus,
  type TasksDocument,
} from "./types.js";

function isMissingFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function emptyDocument(): TasksDocument {
  return { version: 1, tasks: [] };
}

function parseDocument(raw: string): TasksDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("tasks" in parsed) ||
    !Array.isArray(parsed.tasks)
  ) {
    throw new Error("Invalid tasks document shape in .bb/tasks/tasks.json");
  }
  return parsed as TasksDocument;
}

function compareTasks(left: BacklogTask, right: BacklogTask): number {
  const leftNumber = Number.parseInt(left.id.replace(/^TASK-/i, ""), 10);
  const rightNumber = Number.parseInt(right.id.replace(/^TASK-/i, ""), 10);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return rightNumber - leftNumber;
  }
  return right.id.localeCompare(right.id);
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

  private async readFileState(source: ProjectSource): Promise<{
    document: TasksDocument;
    sha256: string | null;
  }> {
    try {
      const file = await this.bb.sdk.files.read({
        ...hostFileArgs(source),
        path: tasksFilePath(source),
      });
      if (file.contentEncoding !== "utf8") {
        throw new Error(".bb/tasks/tasks.json is not UTF-8 text");
      }
      return {
        document: parseDocument(file.content),
        sha256: file.sha256,
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return { document: emptyDocument(), sha256: null };
      }
      throw error;
    }
  }

  private async writeDocument(
    source: ProjectSource,
    document: TasksDocument,
    expectedSha256: string | null,
  ): Promise<void> {
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: `${source.rootPath}/.bb/tasks`,
      recursive: true,
    });
    const content = `${JSON.stringify(document, null, 2)}\n`;
    const result = await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: tasksFilePath(source),
      content,
      contentEncoding: "utf8",
      createParents: true,
      ...(expectedSha256 === null
        ? { expectedSha256: null }
        : { expectedSha256 }),
    });
    if (result.outcome === "conflict") {
      throw new Error(
        "tasks.json changed concurrently; reload and retry the update",
      );
    }
  }

  private async mutate(
    projectId: string,
    mutate: (document: TasksDocument) => void,
  ): Promise<TasksDocument> {
    const source = await resolveProjectSource(this.bb, projectId);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { document, sha256 } = await this.readFileState(source);
      mutate(document);
      try {
        await this.writeDocument(source, document, sha256);
        return document;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("changed concurrently") &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("Failed to update tasks.json after retries");
  }

  async ensureSeed(projectId: string): Promise<BacklogTask | null> {
    const source = await resolveProjectSource(this.bb, projectId);
    const { document, sha256 } = await this.readFileState(source);
    if (document.tasks.length > 0) return null;
    const seed = createSeedTask();
    document.tasks.push(seed);
    await this.writeDocument(source, document, sha256);
    return seed;
  }

  async listTasks(
    projectId: string,
    filters: TaskFilters = {},
  ): Promise<BacklogTask[]> {
    await this.ensureSeed(projectId);
    const source = await resolveProjectSource(this.bb, projectId);
    const { document } = await this.readFileState(source);
    return document.tasks
      .filter((task) => matchesFilters(task, filters))
      .sort(compareTasks);
  }

  async readTask(projectId: string, id: string): Promise<BacklogTask> {
    await this.ensureSeed(projectId);
    const normalized = id.trim().toUpperCase();
    const tasks = await this.listTasks(projectId);
    const task = tasks.find((entry) => entry.id.toUpperCase() === normalized);
    if (!task) {
      throw new Error(`Task "${id}" was not found`);
    }
    return task;
  }

  async createTask(
    projectId: string,
    input: CreateTaskInput,
    sourceThreadId: string,
    createdBy: TaskCreator,
  ): Promise<BacklogTask> {
    let created: BacklogTask | null = null;
    await this.mutate(projectId, (document) => {
      const id = nextTaskId(document.tasks.map((task) => task.id));
      created = {
        id,
        title: input.title.trim(),
        description: input.description.trim(),
        status: "backlog",
        priority: input.priority,
        type: input.type,
        source_thread_id: input.source_thread_id ?? sourceThreadId,
        target_files: input.target_files.map((file) => file.trim()).filter(Boolean),
        suggested_prompt: input.suggested_prompt.trim(),
        created_at: new Date().toISOString(),
        created_by: input.created_by ?? createdBy,
        assigned_thread_id: null,
        resolution_summary: null,
        completed_at: null,
      };
      document.tasks.push(created);
    });
    if (created === null) {
      throw new Error("Failed to create task");
    }
    return created;
  }

  async updateTaskStatus(
    projectId: string,
    id: string,
    status: TaskStatus,
    assignedThreadId?: string | null,
  ): Promise<BacklogTask> {
    let updated: BacklogTask | null = null;
    await this.mutate(projectId, (document) => {
      const index = document.tasks.findIndex(
        (task) => task.id.toUpperCase() === id.trim().toUpperCase(),
      );
      if (index < 0) {
        throw new Error(`Task "${id}" was not found`);
      }
      const current = document.tasks[index]!;
      updated = {
        ...current,
        status,
        assigned_thread_id:
          assignedThreadId === undefined
            ? current.assigned_thread_id
            : assignedThreadId,
        ...(status === "completed"
          ? {
              completed_at: current.completed_at ?? new Date().toISOString(),
            }
          : {}),
      };
      document.tasks[index] = updated;
    });
    if (updated === null) {
      throw new Error(`Task "${id}" was not found`);
    }
    return updated;
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
    let updated: BacklogTask | null = null;
    await this.mutate(projectId, (document) => {
      const index = document.tasks.findIndex(
        (task) => task.id.toUpperCase() === id.trim().toUpperCase(),
      );
      if (index < 0) {
        throw new Error(`Task "${id}" was not found`);
      }
      const current = document.tasks[index]!;
      updated = {
        ...current,
        ...patch,
        title: patch.title?.trim() ?? current.title,
        description: patch.description?.trim() ?? current.description,
        suggested_prompt:
          patch.suggested_prompt?.trim() ?? current.suggested_prompt,
        target_files:
          patch.target_files?.map((file) => file.trim()).filter(Boolean) ??
          current.target_files,
      };
      document.tasks[index] = updated;
    });
    if (updated === null) {
      throw new Error(`Task "${id}" was not found`);
    }
    return updated;
  }

  async completeTask(
    projectId: string,
    id: string,
    resolutionSummary: string,
  ): Promise<BacklogTask> {
    let updated: BacklogTask | null = null;
    await this.mutate(projectId, (document) => {
      const index = document.tasks.findIndex(
        (task) => task.id.toUpperCase() === id.trim().toUpperCase(),
      );
      if (index < 0) {
        throw new Error(`Task "${id}" was not found`);
      }
      const current = document.tasks[index]!;
      updated = {
        ...current,
        status: "completed",
        resolution_summary: resolutionSummary.trim(),
        completed_at: new Date().toISOString(),
      };
      document.tasks[index] = updated;
    });
    if (updated === null) {
      throw new Error(`Task "${id}" was not found`);
    }
    return updated;
  }

  async findTaskByAssignedThread(
    projectId: string,
    threadId: string,
  ): Promise<BacklogTask | null> {
    const tasks = await this.listTasks(projectId, { status: "in_progress" });
    return (
      tasks.find((task) => task.assigned_thread_id === threadId) ?? null
    );
  }
}
