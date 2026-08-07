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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { REALTIME_CHANNEL, rosterRpcContract } from "../../contract.js";
import type {
  AgentStatus,
  CollaborationGroup,
  OfficeLayout,
  RosterAgent,
  RosterEvent,
} from "../types.js";
import { AgentFlyout } from "./AgentFlyout.js";
import { OfficeSceneSkeleton } from "./OfficeSceneSkeleton.js";
import { RosterSidebar } from "./RosterSidebar.js";
import { CreateAgentDialog } from "./CreateAgentDialog.js";
import { AgentFormDialog } from "./AgentFormDialog.js";

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
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AgentRosterPanel(_props: PluginNavPanelProps) {
  const rpc = useRpc<typeof rosterRpcContract>();
  const { projectId: routeProjectId } = useBbContext();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [project, setProject] = useState<PanelProject | null>(null);
  const [agents, setAgents] = useState<RosterAgent[]>([]);
  const [layout, setLayout] = useState<OfficeLayout | null>(null);
  const [events, setEvents] = useState<RosterEvent[]>([]);
  const [collaborationGroups, setCollaborationGroups] = useState<
    CollaborationGroup[]
  >([]);
  const [metrics, setMetrics] = useState({ active: 0, total: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("spatial");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<RosterAgent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<RosterAgent | null>(null);
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
      setCollaborationGroups(result.collaboration_groups);
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

  const spatialAgents = useMemo(
    () =>
      filteredAgents.filter(
        (agent) => agent.spatial_state.status !== "offline",
      ),
    [filteredAgents],
  );

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

  const handleMoveAgent = async (
    agentId: string,
    x: number,
    y: number,
  ): Promise<void> => {
    if (!project) return;
    try {
      await rpc.call("moveAgent", {
        projectId: project.id,
        agentId,
        position_x: x,
        position_y: y,
      });
      await loadRoster();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAssignZone = async (zoneId: string): Promise<void> => {
    if (!project || !selectedAgent) return;
    try {
      await rpc.call("assignAgentToZone", {
        projectId: project.id,
        agentId: selectedAgent.id,
        zoneId,
      });
      toast.success("Agent moved");
      await loadRoster();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleArchiveAgent = async (agentId: string): Promise<void> => {
    if (!project) return;
    try {
      await rpc.call("archiveAgent", {
        projectId: project.id,
        agentId,
      });
      toast.success("Agent archived");
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
              aria-label={`Agent office spatial view, ${spatialAgents.length} agents visible`}
            >
              <SceneErrorBoundary onFallback={() => setViewMode("list")}>
                <Suspense fallback={<OfficeSceneSkeleton />}>
                  <OfficeScene
                    layout={layout}
                    agents={spatialAgents}
                    collaborationGroups={collaborationGroups}
                    selectedAgentId={selectedAgent?.id ?? null}
                    onSelectAgent={setSelectedAgent}
                    onDeselect={() => setSelectedAgent(null)}
                    onMoveAgent={(agentId, x, y) =>
                      void handleMoveAgent(agentId, x, y)
                    }
                  />
                </Suspense>
              </SceneErrorBoundary>
              {selectedAgent ? (
                <AgentFlyout
                  agent={selectedAgent}
                  events={events}
                  onClose={() => setSelectedAgent(null)}
                  onInvoke={(prompt) =>
                    void handleInvoke(selectedAgent.id, prompt)
                  }
                  onAssignZone={(zoneId) => void handleAssignZone(zoneId)}
                  onEdit={() => setEditAgent(selectedAgent)}
                  onArchive={() => void handleArchiveAgent(selectedAgent.id)}
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
                    disabled={agent.spatial_state.status === "offline"}
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

        <RosterSidebar
          agents={filteredAgents}
          events={events}
          selectedAgentId={selectedAgent?.id ?? null}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onSelectAgent={setSelectedAgent}
          onInvokeAgent={(agentId) =>
            void handleInvoke(agentId, "Help with assigned work")
          }
        />
      </div>

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={project.id}
        onCreated={() => void loadRoster()}
      />
      <AgentFormDialog
        open={editAgent !== null}
        onOpenChange={(open) => {
          if (!open) setEditAgent(null);
        }}
        projectId={project.id}
        agent={editAgent}
        onSaved={() => {
          setEditAgent(null);
          void loadRoster();
        }}
      />
    </div>
  );
}
