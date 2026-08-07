import type { AgentZone, OfficeLayout, RosterAgent, SpatialState } from "./types.js";

export const DEFAULT_OFFICE_LAYOUT: OfficeLayout = {
  grid_dimensions: { width: 24, height: 16 },
  zones: [
    {
      id: "fixed_desks",
      name: "Fixed Workstations",
      bounds: { x: 0, y: 0, width: 12, height: 8 },
      type: "execution",
    },
    {
      id: "meeting_room",
      name: "Conference Table",
      bounds: { x: 12, y: 0, width: 12, height: 8 },
      type: "collaboration",
    },
    {
      id: "breakout_room",
      name: "Breakroom / Lounge",
      bounds: { x: 0, y: 8, width: 12, height: 8 },
      type: "idle_pool",
    },
    {
      id: "testing_lab",
      name: "Testing & Execution Lab",
      bounds: { x: 12, y: 8, width: 12, height: 8 },
      type: "execution",
    },
  ],
};

const ZONE_ID_TO_AGENT_ZONE: Record<string, AgentZone> = {
  fixed_desks: "desks",
  meeting_room: "conference_room",
  breakout_room: "lounge",
  testing_lab: "testing_lab",
};

const AGENT_ZONE_TO_ZONE_ID: Record<AgentZone, string> = {
  desks: "fixed_desks",
  conference_room: "meeting_room",
  lounge: "breakout_room",
  testing_lab: "testing_lab",
};

export function agentZoneToLayoutZoneId(zone: AgentZone): string {
  return AGENT_ZONE_TO_ZONE_ID[zone];
}

export function layoutZoneIdToAgentZone(zoneId: string): AgentZone | null {
  return ZONE_ID_TO_AGENT_ZONE[zoneId] ?? null;
}

export function findZoneAtPosition(
  layout: OfficeLayout,
  x: number,
  y: number,
): string | null {
  for (const zone of layout.zones) {
    const { bounds } = zone;
    if (
      x >= bounds.x &&
      x < bounds.x + bounds.width &&
      y >= bounds.y &&
      y < bounds.y + bounds.height
    ) {
      return zone.id;
    }
  }
  return null;
}

export function findAvailableDesk(
  layout: OfficeLayout,
  agents: RosterAgent[],
): SpatialState {
  const deskZone = layout.zones.find((zone) => zone.id === "fixed_desks");
  if (!deskZone) {
    return {
      zone: "desks",
      position_x: 1,
      position_y: 1,
      status: "idle",
      current_task_id: null,
    };
  }
  const occupied = new Set(
    agents
      .filter((agent) => agent.spatial_state.zone === "desks")
      .map(
        (agent) =>
          `${agent.spatial_state.position_x},${agent.spatial_state.position_y}`,
      ),
  );
  for (let y = deskZone.bounds.y + 1; y < deskZone.bounds.y + deskZone.bounds.height - 1; y += 2) {
    for (let x = deskZone.bounds.x + 1; x < deskZone.bounds.x + deskZone.bounds.width - 1; x += 2) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        return {
          zone: "desks",
          position_x: x,
          position_y: y,
          status: "idle",
          current_task_id: null,
        };
      }
    }
  }
  return {
    zone: "lounge",
    position_x: deskZone.bounds.x + 2,
    position_y: deskZone.bounds.y + deskZone.bounds.height + 2,
    status: "idle",
    current_task_id: null,
  };
}

export function positionInZone(
  layout: OfficeLayout,
  zoneId: string,
  index: number,
): { position_x: number; position_y: number } {
  const zone = layout.zones.find((entry) => entry.id === zoneId);
  if (!zone) {
    return { position_x: 1, position_y: 1 };
  }
  const cols = Math.max(1, Math.floor((zone.bounds.width - 2) / 2));
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    position_x: zone.bounds.x + 1 + col * 2,
    position_y: zone.bounds.y + 1 + row * 2,
  };
}

export function spatialStateForZone(
  layout: OfficeLayout,
  zoneId: string,
  agents: RosterAgent[],
  status: SpatialState["status"] = "idle",
): SpatialState {
  const agentZone = layoutZoneIdToAgentZone(zoneId) ?? "desks";
  const agentsInZone = agents.filter(
    (agent) => agent.spatial_state.zone === agentZone,
  );
  const position = positionInZone(layout, zoneId, agentsInZone.length);
  return {
    zone: agentZone,
    ...position,
    status,
    current_task_id: null,
  };
}
