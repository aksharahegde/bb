import type { BbPluginApi } from "@bb/plugin-sdk";
import type { TasksApiStore } from "./api";
import type { Task as StoredTask } from "./db/types";
import type {
  Project,
  Task as ApiTask,
  TaskPriority,
  TaskStatus,
} from "./shared/contract";

export const AUTONOMOUS_BACKLOG_LEGACY_MARKER = "Legacy ID:";
export const AUTONOMOUS_BACKLOG_LABEL_NAME = "autonomous-backlog";

const BACKLOG_TYPES = [
  "tech_debt",
  "test_coverage",
  "refactor",
  "bug",
  "security",
] as const;

export type AutonomousBacklogStatus =
  | "backlog"
  | "in_progress"
  | "completed"
  | "dismissed";
export type AutonomousBacklogPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";
export type AutonomousBacklogType = (typeof BACKLOG_TYPES)[number];

export interface AutonomousBacklogTask {
  id: string;
  title: string;
  description: string;
  status: AutonomousBacklogStatus;
  priority: AutonomousBacklogPriority;
  type: AutonomousBacklogType;
  source_thread_id: string;
  target_files: string[];
  suggested_prompt: string;
  created_at: string;
  created_by: "bb-agent" | "user";
  assigned_thread_id: string | null;
  resolution_summary: string | null;
  completed_at: string | null;
}

export interface AutonomousBacklogDocument {
  version: 1;
  tasks: AutonomousBacklogTask[];
}

export interface ImportAutonomousBacklogResult {
  projectId: string;
  projectKeyPrefix: string;
  imported: number;
  skipped: number;
  createdKeys: string[];
}

function isMissingFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

export function mapBacklogStatusToTasks(
  status: AutonomousBacklogStatus,
): TaskStatus {
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

export function mapTasksStatusToBacklog(
  status: TaskStatus,
): AutonomousBacklogStatus {
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
  }
}

export function mapBacklogPriorityToTasks(
  priority: AutonomousBacklogPriority,
): TaskPriority {
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

export function mapTasksPriorityToBacklog(
  priority: TaskPriority,
): AutonomousBacklogPriority {
  switch (priority) {
    case "urgent":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
    case "none":
      return "low";
  }
}

export function buildImportedDescription(task: AutonomousBacklogTask): string {
  const lines = [
    task.description.trim(),
    "",
    "## Autonomous backlog metadata",
    `${AUTONOMOUS_BACKLOG_LEGACY_MARKER} ${task.id}`,
    `Type: ${task.type}`,
    `Created by: ${task.created_by}`,
    `Source thread: ${task.source_thread_id || "(none)"}`,
    `Suggested prompt: ${task.suggested_prompt}`,
  ];
  if (task.target_files.length > 0) {
    lines.push("Target files:");
    for (const file of task.target_files) {
      lines.push(`- ${file}`);
    }
  }
  if (task.resolution_summary) {
    lines.push(`Resolution: ${task.resolution_summary}`);
  }
  if (task.assigned_thread_id) {
    lines.push(`Assigned thread: ${task.assigned_thread_id}`);
  }
  return `${lines.join("\n").trim()}\n`;
}

export function extractLegacyId(description: string): string | null {
  const match = new RegExp(
    `${AUTONOMOUS_BACKLOG_LEGACY_MARKER}\\s*(TASK-\\d+)`,
    "i",
  ).exec(description);
  return match?.[1]?.toUpperCase() ?? null;
}

export function parseAutonomousBacklogDocument(
  raw: string,
): AutonomousBacklogDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    (parsed as { version: unknown }).version !== 1 ||
    !("tasks" in parsed) ||
    !Array.isArray((parsed as { tasks: unknown }).tasks)
  ) {
    throw new Error("Invalid tasks document shape in .bb/tasks/tasks.json");
  }
  return parsed as AutonomousBacklogDocument;
}

function tasksFilePath(rootPath: string): string {
  return `${rootPath.replace(/\/+$/, "")}/.bb/tasks/tasks.json`;
}

async function resolveProjectSource(
  bb: BbPluginApi,
  projectId: string,
): Promise<{ hostId: string; rootPath: string } | null> {
  const project = await bb.sdk.projects.get({ projectId });
  const source =
    project.sources.find((entry) => entry.isDefault) ?? project.sources[0];
  if (!source) return null;
  return {
    hostId: source.hostId,
    rootPath: source.path.replace(/\/+$/, ""),
  };
}

async function readBacklogDocument(
  bb: BbPluginApi,
  bbProjectId: string,
): Promise<AutonomousBacklogDocument | null> {
  const source = await resolveProjectSource(bb, bbProjectId);
  if (!source) return null;
  try {
    const file = await bb.sdk.files.read({
      hostId: source.hostId,
      rootPath: source.rootPath,
      path: tasksFilePath(source.rootPath),
    });
    if (file.contentEncoding !== "utf8") {
      throw new Error(".bb/tasks/tasks.json is not UTF-8 text");
    }
    return parseAutonomousBacklogDocument(file.content);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function ensureBacklogLabel(store: TasksApiStore, projectId: string): string {
  const existing = store.tasks
    .listLabels(projectId)
    .find(
      (label) =>
        label.name.toLocaleLowerCase() === AUTONOMOUS_BACKLOG_LABEL_NAME,
    );
  if (existing) return existing.id;
  return store.tasks.createLabel({
    projectId,
    name: AUTONOMOUS_BACKLOG_LABEL_NAME,
    color: "#64748b",
  }).id;
}

function ensureLinkedProject(
  store: TasksApiStore,
  bbProjectId: string,
  bbProjectName: string,
): Project {
  const matches = store.tasks
    .listProjects()
    .filter((project) => project.linkedBbProjectId === bbProjectId);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    throw new Error(
      `multiple Tasks projects are linked to BB project ${bbProjectId}; link exactly one before importing`,
    );
  }

  const used = new Set(
    store.tasks.listProjects().map((project) => project.prefix.toUpperCase()),
  );
  let prefix = "BL";
  let index = 2;
  while (used.has(prefix)) {
    prefix = `BL${index}`;
    index += 1;
    if (prefix.length > 10) {
      throw new Error("unable to allocate a Tasks project prefix for import");
    }
  }

  return store.tasks.createProject({
    name: `${bbProjectName} backlog`,
    prefix,
    color: "#64748b",
    folderId: null,
    linkedBbProjectId: bbProjectId,
  });
}

export async function importAutonomousBacklogForBbProject(args: {
  bb: BbPluginApi;
  store: TasksApiStore;
  bbProjectId: string;
}): Promise<ImportAutonomousBacklogResult> {
  const { bb, store, bbProjectId } = args;
  const bbProject = await bb.sdk.projects.get({ projectId: bbProjectId });
  const document = await readBacklogDocument(bb, bbProjectId);
  const project = ensureLinkedProject(store, bbProjectId, bbProject.name);
  if (!document || document.tasks.length === 0) {
    return {
      projectId: project.id,
      projectKeyPrefix: project.prefix,
      imported: 0,
      skipped: 0,
      createdKeys: [],
    };
  }

  const labelId = ensureBacklogLabel(store, project.id);
  const existingLegacy = new Set(
    store.tasks
      .listTasks({ projectId: project.id })
      .map((task) => extractLegacyId(task.description))
      .filter((id): id is string => id !== null),
  );

  let imported = 0;
  let skipped = 0;
  const createdKeys: string[] = [];

  for (const task of document.tasks) {
    const legacyId = task.id.trim().toUpperCase();
    if (existingLegacy.has(legacyId)) {
      skipped += 1;
      continue;
    }
    const created = store.transaction(() => {
      const row = store.tasks.createTask({
        projectId: project.id,
        title: task.title,
        description: buildImportedDescription(task),
        status: mapBacklogStatusToTasks(task.status),
        priority: mapBacklogPriorityToTasks(task.priority),
        dueDate: null,
        parentTaskId: null,
      });
      store.tasks.addTaskLabel(row.id, labelId);
      return row;
    });
    existingLegacy.add(legacyId);
    imported += 1;
    createdKeys.push(created.key);
  }

  return {
    projectId: project.id,
    projectKeyPrefix: project.prefix,
    imported,
    skipped,
    createdKeys,
  };
}

export function taskToBacklogView(
  task: ApiTask | StoredTask,
): AutonomousBacklogTask {
  const legacyId = extractLegacyId(task.description) ?? task.key;
  const typeMatch = /Type:\s*(\w+)/i.exec(task.description);
  const type = (BACKLOG_TYPES as readonly string[]).includes(
    typeMatch?.[1] ?? "",
  )
    ? (typeMatch![1] as AutonomousBacklogType)
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
    id: legacyId,
    title: task.title,
    description: body,
    status: mapTasksStatusToBacklog(task.status),
    priority: mapTasksPriorityToBacklog(task.priority),
    type,
    source_thread_id:
      sourceMatch?.[1] && sourceMatch[1] !== "(none)" ? sourceMatch[1] : "",
    target_files: files,
    suggested_prompt: promptMatch?.[1]?.trim() ?? "",
    created_at: task.createdAt,
    created_by: /Created by:\s*bb-agent/i.test(task.description)
      ? "bb-agent"
      : "user",
    assigned_thread_id: assignedMatch?.[1] ?? null,
    resolution_summary: resolutionMatch?.[1]?.trim() ?? null,
    completed_at: task.status === "done" ? task.updatedAt : null,
  };
}
