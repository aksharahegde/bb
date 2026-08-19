import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useBbContext,
  useRealtime,
  useRpc,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@bb/shared-ui/alert-dialog";
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
import { LayoutEditorPanel } from "./LayoutEditorPanel.js";
import { DEFAULT_OFFICE_LAYOUT } from "../spatial.js";
import { getCharacterPreset } from "../scene/characters/presets.js";
import { CharacterPresetSilhouette } from "./CharacterPresetSilhouette.js";
import { zoneLabel } from "./roster-labels.js";
import { defaultInvokePrompt } from "./roster-prompts.js";
import { isAgentInvokable } from "../lifecycle.js";
import { useActiveDurations } from "./use-active-durations.js";
import type { UsageDisplay } from "../usage-display.js";
import {
  loadStoredSceneSettings,
  saveStoredSceneSettings,
} from "./scene-settings-storage.js";
import {
  DEFAULT_SCENE_SETTINGS,
  type SceneSettings,
} from "../scene/scene-settings.js";

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

function ListAgentRow({
  agent,
  selected,
  duration,
  onSelect,
  onInvoke,
}: {
  agent: RosterAgent;
  selected: boolean;
  duration: string | null;
  onSelect: () => void;
  onInvoke: () => void;
}) {
  const isActive =
    agent.spatial_state.status === "working" ||
    agent.spatial_state.status === "thinking";

  return (
    <div
      data-testid={`roster-row-${agent.id}`}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        selected ? "border-primary/40" : "border-border"
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
      >
        <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-muted/40">
          <CharacterPresetSilhouette
            preset={getCharacterPreset(agent.avatar)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{agent.name}</div>
          <div className="text-xs text-muted-foreground">
            {agent.role} · {zoneLabel(agent.spatial_state.zone)}
          </div>
          {isActive && duration ? (
            <div className="text-xs tabular-nums text-success">
              Running {duration}
            </div>
          ) : null}
        </div>
      </button>
      <Badge className={statusPillClass(agent.spatial_state.status)}>
        {agent.spatial_state.status}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={!isAgentInvokable(agent)}
        onClick={() => onInvoke()}
        data-testid={`roster-quick-invoke-${agent.id}`}
      >
        Invoke
      </Button>
    </div>
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
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<OfficeLayout | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [sceneSettings, setSceneSettings] =
    useState<SceneSettings>(DEFAULT_SCENE_SETTINGS);
  const [focusAgentId, setFocusAgentId] = useState<string | null>(null);
  const [usageDisplay, setUsageDisplay] = useState<UsageDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterReady, setRosterReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layoutDiscardOpen, setLayoutDiscardOpen] = useState(false);
  const realtimeDebounceRef = useRef<number | null>(null);

  const loadProjects = useCallback(async () => {
    const { projects: nextProjects } = await rpc.call("listProjects", null);
    setProjects(nextProjects);
    setProject((current) =>
      current && nextProjects.some((entry) => entry.id === current.id)
        ? current
        : pickDefaultProject(nextProjects, routeProjectId),
    );
  }, [rpc, routeProjectId]);

  useEffect(() => {
    setRosterReady(false);
    setLoading(true);
    setLoadError(null);
  }, [project?.id]);

  useEffect(() => {
    setSceneSettings(loadStoredSceneSettings());
  }, []);

  useEffect(() => {
    saveStoredSceneSettings(sceneSettings);
  }, [sceneSettings]);

  const loadRoster = useCallback(async () => {
    if (!project) return;
    const showBlockingLoad = !rosterReady;
    if (showBlockingLoad) setLoading(true);
    try {
      const result = await rpc.call("listAgents", {
        projectId: project.id,
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
      setRosterReady(true);
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [rpc, project, rosterReady]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    let cancelled = false;
    const loadUsage = async (): Promise<void> => {
      try {
        const result = await rpc.call("getUsageDisplay", null);
        if (!cancelled) setUsageDisplay(result.usage);
      } catch {
        if (!cancelled) setUsageDisplay(null);
      }
    };
    void loadUsage();
    const timer = window.setInterval(() => void loadUsage(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [rpc]);

  useRealtime(REALTIME_CHANNEL, (payload) => {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "projectId" in payload &&
      payload.projectId === project?.id
    ) {
      if (realtimeDebounceRef.current !== null) {
        window.clearTimeout(realtimeDebounceRef.current);
      }
      realtimeDebounceRef.current = window.setTimeout(() => {
        void loadRoster();
      }, 300);
    }
  });

  useEffect(
    () => () => {
      if (realtimeDebounceRef.current !== null) {
        window.clearTimeout(realtimeDebounceRef.current);
      }
    },
    [],
  );

  const activeDurations = useActiveDurations(agents);

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (statusFilter !== "all") {
      result = result.filter(
        (agent) => agent.spatial_state.status === statusFilter,
      );
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;
    return result.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query),
    );
  }, [agents, searchQuery, statusFilter]);

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

  const handleStartLayoutEdit = (): void => {
    if (!layout) return;
    setLayoutEditMode(true);
    setDraftLayout(layout);
    setSelectedAgent(null);
  };

  const handleSelectAgent = (agent: RosterAgent): void => {
    setSelectedAgent(agent);
    setFocusAgentId(agent.id);
  };

  const layoutIsDirty = useMemo(() => {
    if (!layout || !draftLayout) return false;
    return JSON.stringify(layout) !== JSON.stringify(draftLayout);
  }, [layout, draftLayout]);

  const handleCancelLayoutEdit = (): void => {
    setLayoutEditMode(false);
    setDraftLayout(null);
    setLayoutDiscardOpen(false);
  };

  const requestExitLayoutEdit = (): void => {
    if (layoutIsDirty) {
      setLayoutDiscardOpen(true);
      return;
    }
    handleCancelLayoutEdit();
  };

  const handleResetLayoutDraft = (): void => {
    setDraftLayout(DEFAULT_OFFICE_LAYOUT);
  };

  const handleSaveLayout = async (): Promise<void> => {
    if (!project || !draftLayout) return;
    setSavingLayout(true);
    try {
      const result = await rpc.call("saveOfficeLayout", {
        projectId: project.id,
        layout: draftLayout,
      });
      toast.success(
        result.agentsRepositioned > 0
          ? `Layout saved; repositioned ${result.agentsRepositioned} agent(s)`
          : "Layout saved",
      );
      setLayoutEditMode(false);
      setDraftLayout(null);
      await loadRoster();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingLayout(false);
    }
  };

  const previewLayout = layoutEditMode ? (draftLayout ?? layout) : layout;

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
        {viewMode === "spatial" ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={sceneSettings.showZoneLabels ? "default" : "outline"}
              aria-pressed={sceneSettings.showZoneLabels}
              onClick={() =>
                setSceneSettings((current) => ({
                  ...current,
                  showZoneLabels: !current.showZoneLabels,
                }))
              }
              data-testid="roster-scene-labels-toggle"
            >
              Labels
            </Button>
            <Button
              size="sm"
              variant={sceneSettings.showParticles ? "default" : "outline"}
              aria-pressed={sceneSettings.showParticles}
              onClick={() =>
                setSceneSettings((current) => ({
                  ...current,
                  showParticles: !current.showParticles,
                }))
              }
              data-testid="roster-scene-particles-toggle"
            >
              Particles
            </Button>
            <Button
              size="sm"
              variant={sceneSettings.showMovementTrails ? "default" : "outline"}
              aria-pressed={sceneSettings.showMovementTrails}
              onClick={() =>
                setSceneSettings((current) => ({
                  ...current,
                  showMovementTrails: !current.showMovementTrails,
                }))
              }
              data-testid="roster-scene-trails-toggle"
            >
              Trails
            </Button>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {viewMode === "spatial" ? (
            <Button
              size="sm"
              variant={layoutEditMode ? "default" : "outline"}
              onClick={() =>
                layoutEditMode
                  ? requestExitLayoutEdit()
                  : handleStartLayoutEdit()
              }
              data-testid="roster-edit-layout"
            >
              {layoutEditMode ? "Exit Layout Editor" : "Edit Layout"}
            </Button>
          ) : null}
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

      {loadError ? (
        <div
          className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2"
          data-testid="roster-load-error"
        >
          <p className="text-sm text-destructive">
            Could not refresh roster: {loadError}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadRoster()}
            data-testid="roster-load-retry"
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-[7] p-4">
          {!rosterReady && loading ? (
            viewMode === "spatial" ? (
              <OfficeSceneSkeleton />
            ) : (
              <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
                Loading roster…
              </div>
            )
          ) : viewMode === "spatial" && previewLayout ? (
            <div
              className="relative h-full min-h-[480px] overflow-hidden rounded-lg border border-border bg-card"
              data-testid="roster-office-canvas"
              role="img"
              aria-label={`Agent office spatial view, ${spatialAgents.length} agents visible`}
            >
              <SceneErrorBoundary onFallback={() => setViewMode("list")}>
                <Suspense fallback={<OfficeSceneSkeleton />}>
                  <OfficeScene
                    layout={previewLayout}
                    agents={layoutEditMode ? [] : spatialAgents}
                    collaborationGroups={collaborationGroups}
                    selectedAgentId={selectedAgent?.id ?? null}
                    focusAgentId={focusAgentId}
                    sceneSettings={sceneSettings}
                    usageDisplay={usageDisplay}
                    onSelectAgent={handleSelectAgent}
                    onFocusAgent={(agent) => setFocusAgentId(agent.id)}
                    onDeselect={() => setSelectedAgent(null)}
                    onMoveAgent={(agentId, x, y) =>
                      void handleMoveAgent(agentId, x, y)
                    }
                  />
                </Suspense>
              </SceneErrorBoundary>
              {layoutEditMode && draftLayout ? (
                <LayoutEditorPanel
                  layout={draftLayout}
                  saving={savingLayout}
                  onChange={setDraftLayout}
                  onSave={() => void handleSaveLayout()}
                  onCancel={requestExitLayoutEdit}
                  onReset={handleResetLayoutDraft}
                />
              ) : null}
              {!layoutEditMode && selectedAgent ? (
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
            <div className="relative min-h-[480px]">
              <div className="space-y-2 overflow-y-auto">
                {filteredAgents.length === 0 ? (
                  <div
                    className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-6 text-center"
                    data-testid="roster-list-empty"
                  >
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "No agents match the current filters."
                        : "No agents yet. Create one to get started."}
                    </p>
                    {searchQuery || statusFilter !== "all" ? null : (
                      <Button
                        size="sm"
                        onClick={() => setCreateOpen(true)}
                        data-testid="roster-list-create-agent"
                      >
                        Create Custom Agent
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <ListAgentRow
                      key={agent.id}
                      agent={agent}
                      selected={selectedAgent?.id === agent.id}
                      duration={activeDurations.get(agent.id) ?? null}
                      onSelect={() => handleSelectAgent(agent)}
                      onInvoke={() =>
                        void handleInvoke(
                          agent.id,
                          defaultInvokePrompt(agent.role),
                        )
                      }
                    />
                  ))
                )}
              </div>
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
          )}
        </div>

        <RosterSidebar
          agents={filteredAgents}
          events={events}
          selectedAgentId={selectedAgent?.id ?? null}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          activeDurations={activeDurations}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onSelectAgent={handleSelectAgent}
          onInvokeAgent={(agentId) => {
            const agent = agents.find((entry) => entry.id === agentId);
            if (!agent) return;
            void handleInvoke(agentId, defaultInvokePrompt(agent.role));
          }}
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

      <AlertDialog open={layoutDiscardOpen} onOpenChange={setLayoutDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard layout changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved zone splits and names will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="roster-layout-discard-cancel">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelLayoutEdit}
              data-testid="roster-layout-discard-confirm"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
