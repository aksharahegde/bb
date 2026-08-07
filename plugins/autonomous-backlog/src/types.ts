export const TASK_STATUSES = [
  "backlog",
  "in_progress",
  "completed",
  "dismissed",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const TASK_TYPES = [
  "tech_debt",
  "test_coverage",
  "refactor",
  "bug",
  "security",
] as const;

export const TASK_CREATORS = ["bb-agent", "user"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskCreator = (typeof TASK_CREATORS)[number];

export interface BacklogTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  source_thread_id: string;
  target_files: string[];
  suggested_prompt: string;
  created_at: string;
  created_by: TaskCreator;
  assigned_thread_id: string | null;
  resolution_summary: string | null;
  completed_at: string | null;
}

export interface TasksDocument {
  version: 1;
  tasks: BacklogTask[];
}

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
  target_files: string[];
  suggested_prompt: string;
  source_thread_id?: string;
  created_by?: TaskCreator;
}

export function nextTaskId(existingIds: readonly string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = /^TASK-(\d+)$/i.exec(id.trim());
      return match ? Number.parseInt(match[1]!, 10) : Number.NaN;
    })
    .filter((value) => Number.isFinite(value));
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  return `TASK-${String(next).padStart(3, "0")}`;
}

export function createSeedTask(): BacklogTask {
  const now = new Date().toISOString();
  return {
    id: "TASK-001",
    title: "Verify Autonomous Backlog end-to-end",
    description:
      "Seed task confirming agent-discovered backlog items persist in .bb/tasks/tasks.json and render in the Autonomous Backlog panel.",
    status: "backlog",
    priority: "medium",
    type: "tech_debt",
    source_thread_id: "",
    target_files: [".bb/tasks/tasks.json"],
    suggested_prompt:
      "Confirm the Autonomous Backlog plugin reads and writes .bb/tasks/tasks.json, then mark TASK-001 completed with a short resolution summary.",
    created_at: now,
    created_by: "user",
    assigned_thread_id: null,
    resolution_summary: null,
    completed_at: null,
  };
}
