import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useBbContext,
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
import { REALTIME_CHANNEL, rosterRpcContract } from "../../contract.js";
import type {
  AgentStatus,
  OfficeLayout,
  RosterAgent,
  RosterEvent,
} from "../types.js";
import { OfficeSceneSkeleton } from "./OfficeSceneSkeleton.js";

const OfficeScene = lazy(() => import("../scene/OfficeScene.js"));

type ViewMode = "spatial" | "list";
type StatusFilter = AgentStatus | "all";

interface PanelProject {
  id: string;
  name: string;
  kind: "personal" | "standard";
  hasSource: boolean;
}

class SceneErrorBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            3D view unavailable in this environment.
          </p>
          <Button size="sm" onClick={this.props.onFallback}>
            Switch to List view
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
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

function statusPillClass(status: AgentStatus): string {
  switch (status) {
    case "working":
    case "thinking":
      return "bg-success/15 text-success";
    case "error":
      return "bg-destructive/15 text-destructive";
    case "offline":
      return "bg-muted text-muted-foreground";
    case "idle":
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatEventTime(at: string): string {
  const date = new Date(at);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AgentFlyout({
  agent,
  onClose,
  onInvoke,
}: {
  agent: RosterAgent;
  onClose: () => void;
  onInvoke: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <div
      className="absolute bottom-4 left-4 z-30 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg"
      data-testid="roster-agent-flyout"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.avatar}</span>
          <div>
            <div className="text-sm font-semibold">{agent.name}</div>
            <Badge variant="secondary" className="text-[10px]">
              {agent.role}
            </Badge>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <div className="mb-1 font-medium text-muted-foreground">
            System prompt
          </div>
          <p className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-muted/30 p-2 text-foreground">
            {agent.system_prompt}
          </p>
        </div>
        <div>
          <div className="mb-1 font-medium text-muted-foreground">
            Direct prompt
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="Ask this agent to do something…"
            data-testid="roster-flyout-prompt-input"
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={prompt.trim().length === 0}
          onClick={() => onInvoke(prompt.trim())}
          data-testid="roster-flyout-assign-task"
        >
          Assign Task
        </Button>
      </div>
    </div>
  );
}

function CreateAgentDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}) {
  const rpc = useRpc<typeof rosterRpcContract>();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Debugger");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [model, setModel] = useState("claude-sonnet-5-thinking-high");
  const [tools, setTools] = useState<string[]>(["read_file"]);
  const [options, setOptions] = useState<{
    avatars: string[];
    tools: { id: string; label: string }[];
    models: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void rpc.call("getFormOptions", null).then(setOptions);
  }, [open, rpc]);

  const toggleTool = (toolId: string): void => {
    setTools((current) =>
      current.includes(toolId)
        ? current.filter((entry) => entry !== toolId)
        : [...current, toolId],
    );
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await rpc.call("registerAgent", {
        projectId,
        name,
        role,
        system_prompt: systemPrompt,
        avatar,
        allowed_tools: tools,
        default_model: model,
      });
      toast.success(`Created ${name}`);
      onOpenChange(false);
      setName("");
      setSystemPrompt("");
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Custom Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-testid="roster-create-name-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              data-testid="roster-create-role-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">System prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={4}
              data-testid="roster-create-prompt-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="roster-create-model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(options?.models ?? [model]).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {(options?.avatars ?? ["🤖"]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border text-xl",
                    avatar === entry
                      ? "border-primary bg-primary/10"
                      : "border-border",
                  )}
                  onClick={() => setAvatar(entry)}
                  data-testid={`roster-create-avatar-${entry}`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tool access</label>
            <div className="grid grid-cols-2 gap-2">
              {(options?.tools ?? []).map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                  />
                  {tool.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              name.trim().length === 0 ||
              systemPrompt.trim().length === 0
            }
            data-testid="roster-create-submit"
          >
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AgentRosterPanel(_props: PluginNavPanelProps) {
  const rpc = useRpc<typeof rosterRpcContract>();
  const { projectId: routeProjectId } = useBbContext();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [project, setProject] = useState<PanelProject | null>(null);
  const [agents, setAgents] = useState<RosterAgent[]>([]);
  const [layout, setLayout] = useState<OfficeLayout | null>(null);
  const [events, setEvents] = useState<RosterEvent[]>([]);
  const [metrics, setMetrics] = useState({ active: 0, total: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("spatial");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<RosterAgent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { projects: nextProjects } = await rpc.call("listProjects", null);
    setProjects(nextProjects);
    setProject((current) =>
      current && nextProjects.some((entry) => entry.id === current.id)
        ? current
        : pickDefaultProject(nextProjects, routeProjectId),
    );
  }, [rpc, routeProjectId]);

  const loadRoster = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await rpc.call("listAgents", {
        projectId: project.id,
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
      });
      setAgents(result.agents);
      setLayout(result.layout);
      setEvents(result.events);
      setMetrics(result.metrics);
      setSelectedAgent((current) =>
        current
          ? (result.agents.find((agent) => agent.id === current.id) ?? null)
          : null,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [rpc, project, statusFilter]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useRealtime(REALTIME_CHANNEL, (payload) => {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "projectId" in payload &&
      payload.projectId === project?.id
    ) {
      void loadRoster();
    }
  });

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query),
    );
  }, [agents, searchQuery]);

  const handleInvoke = async (agentId: string, prompt: string): Promise<void> => {
    if (!project) return;
    try {
      await rpc.call("invokeAgent", {
        projectId: project.id,
        agentId,
        prompt,
      });
      toast.success("Agent dispatched");
      setSelectedAgent(null);
      await loadRoster();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Select a project with a workspace source to open Agent Roaster.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={viewMode === "spatial" ? "default" : "ghost"}
            onClick={() => setViewMode("spatial")}
            data-testid="roster-view-spatial"
          >
            Spatial View
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            data-testid="roster-view-list"
          >
            List View
          </Button>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          Active: {metrics.active}/{metrics.total}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="roster-create-agent"
          >
            + Create Custom Agent
          </Button>
          <Select
            value={project.id}
            onValueChange={(value) =>
              setProject(projects.find((entry) => entry.id === value) ?? null)
            }
          >
            <SelectTrigger className="w-[180px]" data-testid="roster-project-select">
              <SelectValue />
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-[7] p-4">
          {loading ? (
            <OfficeSceneSkeleton />
          ) : viewMode === "spatial" && layout ? (
            <div
              className="relative h-full min-h-[480px] overflow-hidden rounded-lg border border-border bg-card"
              data-testid="roster-office-canvas"
              role="img"
              aria-label={`Agent office spatial view, ${filteredAgents.length} agents visible`}
            >
              <SceneErrorBoundary onFallback={() => setViewMode("list")}>
                <Suspense fallback={<OfficeSceneSkeleton />}>
                  <OfficeScene
                    layout={layout}
                    agents={filteredAgents}
                    selectedAgentId={selectedAgent?.id ?? null}
                    onSelectAgent={setSelectedAgent}
                    onDeselect={() => setSelectedAgent(null)}
                  />
                </Suspense>
              </SceneErrorBoundary>
              {selectedAgent ? (
                <AgentFlyout
                  agent={selectedAgent}
                  onClose={() => setSelectedAgent(null)}
                  onInvoke={(prompt) =>
                    void handleInvoke(selectedAgent.id, prompt)
                  }
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  data-testid={`roster-row-${agent.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <span className="text-2xl">{agent.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {agent.role}
                    </div>
                  </div>
                  <Badge className={statusPillClass(agent.spatial_state.status)}>
                    {agent.spatial_state.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void handleInvoke(
                        agent.id,
                        `Help with ${agent.role.toLowerCase()} work`,
                      )
                    }
                    data-testid="roster-quick-invoke"
                  >
                    Invoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="flex min-w-[280px] flex-[3] flex-col border-l border-border">
          <div className="space-y-3 border-b border-border p-4">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search agents…"
              data-testid="roster-search-input"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger data-testid="roster-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="working">Active</SelectItem>
                <SelectItem value="thinking">Thinking</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roster
              </h3>
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm",
                    selectedAgent?.id === agent.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                  onClick={() => setSelectedAgent(agent)}
                  data-testid={`roster-sidebar-row-${agent.id}`}
                >
                  <span>{agent.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {agent.role}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] capitalize",
                      statusPillClass(agent.spatial_state.status),
                    )}
                  >
                    {agent.spatial_state.status}
                  </Badge>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live events
              </h3>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events yet.</p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border bg-muted/20 px-2 py-1.5 text-[11px]"
                    data-testid={`roster-event-${event.id}`}
                  >
                    <span className="font-mono text-muted-foreground">
                      {formatEventTime(event.at)}
                    </span>
                    <span className="text-foreground"> — {event.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={project.id}
        onCreated={() => void loadRoster()}
      />
    </div>
  );
}
