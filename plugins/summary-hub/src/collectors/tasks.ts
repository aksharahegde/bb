import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { hostFileArgs, resolveProjectSource } from "../project-source.js";
import type { CollectedTask } from "../types.js";

interface TasksDocument {
  version: 1;
  tasks: CollectedTask[];
}

function isMissingFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function parseDocument(raw: string): TasksDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("tasks" in parsed) ||
    !Array.isArray((parsed as TasksDocument).tasks)
  ) {
    throw new Error("Invalid tasks document shape in .bb/tasks/tasks.json");
  }
  return parsed as TasksDocument;
}

function inWindow(
  isoTimestamp: string | null,
  start: Date,
  end: Date,
): boolean {
  if (isoTimestamp === null || isoTimestamp.trim().length === 0) return false;
  const value = Date.parse(isoTimestamp);
  if (!Number.isFinite(value)) return false;
  return value >= start.getTime() && value < end.getTime();
}

export async function collectTasks(
  bb: BbPluginApi,
  projectId: string,
  start: Date,
  end: Date,
): Promise<{ completed: CollectedTask[]; deferred: CollectedTask[] }> {
  const source = await resolveProjectSource(bb, projectId);
  const path = `${source.rootPath}/.bb/tasks/tasks.json`;
  try {
    const file = await bb.sdk.files.read({
      ...hostFileArgs(source),
      path,
    });
    if (file.contentEncoding !== "utf8") {
      throw new Error(".bb/tasks/tasks.json is not UTF-8 text");
    }
    const document = parseDocument(file.content);
    const completed = document.tasks.filter(
      (task) =>
        task.status === "completed" && inWindow(task.completed_at, start, end),
    );
    const deferred = document.tasks.filter(
      (task) =>
        task.status === "backlog" &&
        (task.priority === "critical" || task.priority === "high"),
    );
    return { completed, deferred };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { completed: [], deferred: [] };
    }
    throw error;
  }
}
