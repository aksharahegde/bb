import { useCallback, useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  useBbContext,
  useBbNavigate,
  useRealtime,
  useRpc,
  type PluginNavPanelProps,
} from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@bb/shared-ui/dialog";
import { Input } from "@bb/shared-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { Textarea } from "@bb/shared-ui/textarea";
import { cn } from "@bb/shared-ui/lib/utils";
import { REALTIME_CHANNEL, backlogRpcContract } from "./server.js";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type BacklogTask,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "./src/types.js";

type FilterStatus = TaskStatus | "all";
type FilterType = TaskType | "all";
type FilterPriority = TaskPriority | "all";

interface PanelProject {
  id: string;
  name: string;
  kind: "personal" | "standard";
  hasSource: boolean;
}

interface TaskCounts {
  backlog: number;
  in_progress: number;
  completed: number;
  dismissed: number;
}

function priorityIndicatorClass(priority: TaskPriority): string {
  switch (priority) {
    case "critical":
      return "bg-destructive";
    case "high":
      return "bg-warning";
    case "medium":
      return "bg-warning/60";
    case "low":
      return "bg-muted-foreground/50";
  }
}

function typeLabel(type: TaskType): string {
  return type.replaceAll("_", " ");
}

function pickDefaultProject(
  projects: PanelProject[],
  preferredProjectId: string | null,
): PanelProject | null {
  const withSource = projects.filter((project) => project.hasSource);
  if (withSource.length === 0) return null;
  if (preferredProjectId) {
    const preferred = withSource.find(
      (project) => project.id === preferredProjectId,
    );
    if (preferred) return preferred;
  }
  const personal = withSource.find((project) => project.kind === "personal");
  return personal ?? withSource[0] ?? null;
}

function TaskCard({
  task,
  selected,
  onSelect,
  onDispatch,
  onDismiss,
  onEdit,
  onOpenSourceThread,
}: {
  task: BacklogTask;
  selected: boolean;
  onSelect: () => void;
  onDispatch: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onOpenSourceThread: () => void;
}) {
  return (
    <div
      data-testid={`backlog-row-${task.id.toLowerCase()}`}
      className={cn(
        "rounded-lg border p-3 transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2.5 shrink-0 rounded-full",
              priorityIndicatorClass(task.priority),
            )}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {task.id}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                #{task.type}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {task.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="text-sm font-medium text-foreground">{task.title}</div>
            {task.target_files.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {task.target_files.map((file) => (
                  <Badge
                    key={file}
                    variant="outline"
                    className="max-w-full truncate font-mono text-[10px]"
                  >
                    {file}
                  </Badge>
                ))}
              </div>
            ) : null}
            {task.source_thread_id ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenSourceThread();
                }}
                className="text-xs text-primary hover:underline"
                data-testid="backlog-source-thread-link"
              >
                Discovered in Thread #{task.source_thread_id.slice(-6)}
              </button>
            ) : null}
          </div>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-2 pl-5">
        <Button
          size="sm"
          onClick={onDispatch}
          disabled={task.status === "completed" || task.status === "dismissed"}
          data-testid="backlog-dispatch-agent"
        >
          Dispatch Agent
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          data-testid="backlog-edit-task"
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          disabled={task.status === "dismissed"}
          data-testid="backlog-dismiss-task"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function TaskInspector({
  task,
  onOpenSourceThread,
  onOpenAssignedThread,
}: {
  task: BacklogTask;
  onOpenSourceThread: () => void;
  onOpenAssignedThread: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Task Inspector
        </div>
        <div className="mt-1 text-base font-medium text-foreground">
          {task.id}: {task.title}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </h3>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {task.description}
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Target files
          </h3>
          {task.target_files.length === 0 ? (
            <p className="text-sm text-muted-foreground">None listed.</p>
          ) : (
            <ul className="space-y-1">
              {task.target_files.map((file) => (
                <li
                  key={file}
                  className="rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                >
                  {file}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested agent prompt
          </h3>
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {task.suggested_prompt}
          </pre>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Execution history
          </h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>Created {new Date(task.created_at).toLocaleString()}</div>
            <div>Created by {task.created_by}</div>
            {task.source_thread_id ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={onOpenSourceThread}
              >
                Source thread {task.source_thread_id}
              </button>
            ) : null}
            {task.assigned_thread_id ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={onOpenAssignedThread}
              >
                Assigned thread {task.assigned_thread_id}
              </button>
            ) : null}
            {task.resolution_summary ? (
              <div className="rounded-md border border-border bg-card p-2 text-foreground">
                {task.resolution_summary}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function TaskFormDialog({
  open,
  title,
  initial,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: BacklogTask;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    description: string;
    priority: TaskPriority;
    type: TaskType;
    target_files: string[];
    suggested_prompt: string;
  }) => Promise<void>;
}) {
  const [taskTitle, setTaskTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? "medium",
  );
  const [type, setType] = useState<TaskType>(initial?.type ?? "tech_debt");
  const [targetFiles, setTargetFiles] = useState(
    initial?.target_files.join("\n") ?? "",
  );
  const [suggestedPrompt, setSuggestedPrompt] = useState(
    initial?.suggested_prompt ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTaskTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setPriority(initial?.priority ?? "medium");
    setType(initial?.type ?? "tech_debt");
    setTargetFiles(initial?.target_files.join("\n") ?? "");
    setSuggestedPrompt(initial?.suggested_prompt ?? "");
  }, [initial, open]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: taskTitle.trim(),
        description: description.trim(),
        priority,
        type,
        target_files: targetFiles
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
        suggested_prompt: suggestedPrompt.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Short summary"
            data-testid="backlog-title-input"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detailed context and rationale"
            rows={4}
            data-testid="backlog-description-input"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as TaskPriority)}
            >
              <SelectTrigger data-testid="backlog-priority-select">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={type}
              onValueChange={(value) => setType(value as TaskType)}
            >
              <SelectTrigger data-testid="backlog-type-select">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {typeLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={targetFiles}
            onChange={(event) => setTargetFiles(event.target.value)}
            placeholder="Target files (one per line)"
            rows={3}
            data-testid="backlog-target-files-input"
          />
          <Textarea
            value={suggestedPrompt}
            onChange={(event) => setSuggestedPrompt(event.target.value)}
            placeholder="Suggested execution prompt for the agent"
            rows={5}
            data-testid="backlog-suggested-prompt-input"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => void submit()}
            disabled={
              submitting ||
              taskTitle.trim().length === 0 ||
              description.trim().length === 0 ||
              suggestedPrompt.trim().length === 0
            }
            data-testid="backlog-task-submit"
          >
            {submitting ? "Saving…" : "Save task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutonomousBacklogPanel({ subPath }: PluginNavPanelProps) {
  const rpc = useRpc<typeof backlogRpcContract>();
  const navigate = useBbNavigate();
  const { projectId: routeProjectId, threadId } = useBbContext();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [project, setProject] = useState<PanelProject | null>(null);
  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({
    backlog: 0,
    in_progress: 0,
    completed: 0,
    dismissed: 0,
  });
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    subPath.trim() || null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BacklogTask | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [selectedId, tasks],
  );

  const loadProjects = useCallback(async () => {
    const { projects: nextProjects } = await rpc.call("listProjects", null);
    setProjects(nextProjects);
    setProject((current) => current ?? pickDefaultProject(nextProjects, routeProjectId));
  }, [rpc, routeProjectId]);

  const loadTasks = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await rpc.call("listTasks", {
        projectId: project.id,
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
        ...(typeFilter === "all" ? {} : { type: typeFilter }),
        ...(priorityFilter === "all" ? {} : { priority: priorityFilter }),
      });
      setTasks(result.tasks);
      setCounts(result.counts);
      if (
        selectedId &&
        !result.tasks.some((task) => task.id === selectedId)
      ) {
        setSelectedId(result.tasks[0]?.id ?? null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, project, rpc, selectedId, statusFilter, typeFilter]);

  useEffect(() => {
    void loadProjects().catch((error) => {
      toast.error(error instanceof Error ? error.message : String(error));
    });
  }, [loadProjects]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useRealtime(REALTIME_CHANNEL, (payload) => {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "projectId" in payload &&
      payload.projectId === project?.id
    ) {
      void loadTasks();
    }
  });

  const dispatchTask = async (task: BacklogTask) => {
    if (!project) return;
    try {
      const { threadId: spawnedThreadId } = await rpc.call("dispatchTask", {
        projectId: project.id,
        id: task.id,
        parentThreadId: threadId,
      });
      toast.success(`Dispatched ${task.id}`);
      navigate.toThread(spawnedThreadId);
      await loadTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const dismissTask = async (task: BacklogTask) => {
    if (!project) return;
    try {
      await rpc.call("updateTaskStatus", {
        projectId: project.id,
        id: task.id,
        status: "dismissed",
      });
      toast.success(`Dismissed ${task.id}`);
      await loadTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-4 md:px-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Backlog {counts.backlog}</Badge>
            <Badge variant="secondary">In Progress {counts.in_progress}</Badge>
            <Badge variant="secondary">Completed {counts.completed}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={project?.id ?? ""}
              onValueChange={(value) => {
                const next = projects.find((entry) => entry.id === value) ?? null;
                setProject(next);
              }}
            >
              <SelectTrigger className="w-[220px]" data-testid="backlog-project-select">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter((entry) => entry.hasSource)
                  .map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as FilterStatus)}
            >
              <SelectTrigger className="w-[160px]" data-testid="backlog-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as FilterType)}
            >
              <SelectTrigger className="w-[160px]" data-testid="backlog-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TASK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as FilterPriority)
              }
            >
              <SelectTrigger className="w-[160px]" data-testid="backlog-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!project}
              data-testid="backlog-add-task"
            >
              + Add Task Manually
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-y-auto p-4 md:p-5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
                data-testid="backlog-empty-state"
              >
                No pending agent-discovered tasks. Agents will log technical debt
                and edge cases here as you work.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={task.id === selectedId}
                    onSelect={() => setSelectedId(task.id)}
                    onDispatch={() => void dispatchTask(task)}
                    onDismiss={() => void dismissTask(task)}
                    onEdit={() => setEditingTask(task)}
                    onOpenSourceThread={() => {
                      if (task.source_thread_id) {
                        navigate.toThread(task.source_thread_id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {selectedTask ? (
            <TaskInspector
              task={selectedTask}
              onOpenSourceThread={() => {
                if (selectedTask.source_thread_id) {
                  navigate.toThread(selectedTask.source_thread_id);
                }
              }}
              onOpenAssignedThread={() => {
                if (selectedTask.assigned_thread_id) {
                  navigate.toThread(selectedTask.assigned_thread_id);
                }
              }}
            />
          ) : null}
        </div>
      </div>

      <TaskFormDialog
        open={createOpen}
        title="Add backlog task"
        onOpenChange={setCreateOpen}
        onSubmit={async (values) => {
          if (!project) return;
          await rpc.call("createTask", { projectId: project.id, ...values });
          toast.success("Task created");
          await loadTasks();
        }}
      />
      <TaskFormDialog
        open={editingTask !== null}
        title={`Edit ${editingTask?.id ?? "task"}`}
        initial={editingTask ?? undefined}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        onSubmit={async (values) => {
          if (!project || !editingTask) return;
          await rpc.call("updateTask", {
            projectId: project.id,
            id: editingTask.id,
            ...values,
          });
          toast.success(`${editingTask.id} updated`);
          setEditingTask(null);
          await loadTasks();
        }}
      />
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "backlog",
    title: "Autonomous Backlog",
    icon: "ListTodo",
    path: "backlog",
    component: AutonomousBacklogPanel,
  });
});
