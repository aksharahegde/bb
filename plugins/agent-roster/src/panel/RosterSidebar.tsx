import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import { Input } from "@bb/shared-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { cn } from "@bb/shared-ui/lib/utils";
import type { AgentStatus, RosterAgent, RosterEvent } from "../types.js";
import { isAgentInvokable } from "../lifecycle.js";
import { getCharacterPreset } from "../scene/characters/presets.js";
import { CharacterPresetSilhouette } from "./CharacterPresetSilhouette.js";
import { zoneLabel } from "./roster-labels.js";
import { useActiveDuration } from "./AgentFlyout.js";

type StatusFilter = AgentStatus | "all";

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

function AgentRosterCard({
  agent,
  selected,
  onSelect,
  onInvoke,
}: {
  agent: RosterAgent;
  selected: boolean;
  onSelect: () => void;
  onInvoke: () => void;
}) {
  const duration = useActiveDuration(agent.active_since);
  const isActive =
    agent.spatial_state.status === "working" ||
    agent.spatial_state.status === "thinking";

  return (
    <div
      className={cn(
        "w-full rounded-lg border p-3",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border",
      )}
      data-testid={`roster-sidebar-row-${agent.id}`}
    >
      <button
        type="button"
        className="w-full text-left transition-colors hover:opacity-90"
        onClick={onSelect}
      >
        <div className="flex items-start gap-2">
          <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-muted/40">
            <CharacterPresetSilhouette preset={getCharacterPreset(agent.avatar)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-medium">{agent.name}</div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[9px] capitalize",
                  statusPillClass(agent.spatial_state.status),
                )}
              >
                {agent.spatial_state.status}
              </Badge>
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {agent.role} · {zoneLabel(agent.spatial_state.zone)}
            </div>
            {isActive && duration ? (
              <div className="mt-1 text-[10px] tabular-nums text-success">
                Running {duration}
              </div>
            ) : null}
          </div>
        </div>
      </button>
      <div className="mt-2 flex justify-end">
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
    </div>
  );
}

export function RosterSidebar({
  agents,
  events,
  selectedAgentId,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelectAgent,
  onInvokeAgent,
}: {
  agents: RosterAgent[];
  events: RosterEvent[];
  selectedAgentId: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectAgent: (agent: RosterAgent) => void;
  onInvokeAgent: (agentId: string) => void;
}) {
  return (
    <aside className="flex min-w-[280px] flex-[3] flex-col border-l border-border">
      <div className="space-y-3 border-b border-border p-4">
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search agents…"
          data-testid="roster-search-input"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
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
          {agents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No agents match the current filters.
            </p>
          ) : (
            agents.map((agent) => (
              <AgentRosterCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={() => onSelectAgent(agent)}
                onInvoke={() => onInvokeAgent(agent.id)}
              />
            ))
          )}
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
  );
}
