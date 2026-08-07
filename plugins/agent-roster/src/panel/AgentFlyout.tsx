import { useEffect, useState } from "react";
import { Badge } from "@bb/shared-ui/badge";
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
import { Button } from "@bb/shared-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { Textarea } from "@bb/shared-ui/textarea";
import type { RosterAgent } from "../types.js";
import { agentZoneToLayoutZoneId } from "../spatial.js";
import { getCharacterPreset } from "../scene/characters/presets.js";
import { CharacterPresetSilhouette } from "./CharacterPresetSilhouette.js";
import { isAgentActive, isAgentInvokable } from "../lifecycle.js";

const ZONE_OPTIONS = [
  { id: "fixed_desks", label: "Desks" },
  { id: "meeting_room", label: "Conference" },
  { id: "breakout_room", label: "Lounge" },
  { id: "testing_lab", label: "Testing Lab" },
] as const;

export function AgentFlyout({
  agent,
  events,
  onClose,
  onInvoke,
  onAssignZone,
  onEdit,
  onArchive,
}: {
  agent: RosterAgent;
  events: Array<{ id: string; message: string; at: string; agent_id: string | null }>;
  onClose: () => void;
  onInvoke: (prompt: string) => void;
  onAssignZone: (zoneId: string) => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const agentEvents = events.filter((event) => event.agent_id === agent.id);
  const isActive = isAgentActive(agent);
  const isOffline = agent.spatial_state.status === "offline";
  const currentZoneId = agentZoneToLayoutZoneId(agent.spatial_state.zone);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-40 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg"
      data-testid="roster-agent-flyout"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-muted/40">
            <CharacterPresetSilhouette preset={getCharacterPreset(agent.avatar)} />
          </div>
          <div>
            <div className="text-sm font-semibold">{agent.name}</div>
            <Badge variant="secondary" className="text-xs">
              {agent.role}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close agent details"
          data-testid="roster-flyout-close"
        >
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
        <div className="space-y-1">
          <div className="font-medium text-muted-foreground">Move to zone</div>
          <Select value={currentZoneId} onValueChange={onAssignZone}>
            <SelectTrigger data-testid="roster-flyout-zone-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_OPTIONS.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        {agentEvents.length > 0 ? (
          <div>
            <div className="mb-1 font-medium text-muted-foreground">
              Recent activity
            </div>
            <ul className="max-h-20 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {agentEvents.slice(0, 5).map((event) => (
                <li key={event.id}>{event.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button
          size="sm"
          className="w-full"
          disabled={prompt.trim().length === 0 || !isAgentInvokable(agent)}
          onClick={() => onInvoke(prompt.trim())}
          data-testid="roster-flyout-assign-task"
        >
          Assign Task
        </Button>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onEdit}
            data-testid="roster-flyout-edit"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={isActive || isOffline}
            onClick={() => setArchiveOpen(true)}
            data-testid="roster-flyout-archive"
          >
            Archive
          </Button>
        </div>
      </div>
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {agent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived agents are marked offline and hidden from the office
              view. They remain in the roster list when you show all statuses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setArchiveOpen(false);
                onArchive();
              }}
              data-testid="roster-flyout-archive-confirm"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
