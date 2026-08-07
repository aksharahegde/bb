import { generateOfficeSlots, nearestSlot, slotOccupant } from "./scene/slots.js";
import {
  agentZoneToLayoutZoneId,
  DEFAULT_OFFICE_LAYOUT,
  positionInZone,
} from "./spatial.js";
import type {
  OfficeLayout,
  OfficeZone,
  RosterAgent,
  SpatialState,
  ZoneBounds,
  ZoneType,
} from "./types.js";

export const FIXED_GRID = { width: 24, height: 16 } as const;
export const MIN_ZONE_SIZE = 4;

export const LAYOUT_ZONE_IDS = [
  "fixed_desks",
  "meeting_room",
  "breakout_room",
  "testing_lab",
] as const;

const ZONE_TYPES: Record<(typeof LAYOUT_ZONE_IDS)[number], ZoneType> = {
  fixed_desks: "execution",
  meeting_room: "collaboration",
  breakout_room: "idle_pool",
  testing_lab: "execution",
};

function defaultZone(id: (typeof LAYOUT_ZONE_IDS)[number]): OfficeZone {
  const zone = DEFAULT_OFFICE_LAYOUT.zones.find((entry) => entry.id === id);
  if (!zone) {
    throw new Error(`Missing default zone ${id}`);
  }
  return zone;
}

export function validateSplits(
  columnSplit: number,
  rowSplit: number,
): string | null {
  if (
    columnSplit < MIN_ZONE_SIZE ||
    columnSplit > FIXED_GRID.width - MIN_ZONE_SIZE
  ) {
    return `Column split must be between ${MIN_ZONE_SIZE} and ${FIXED_GRID.width - MIN_ZONE_SIZE}`;
  }
  if (
    rowSplit < MIN_ZONE_SIZE ||
    rowSplit > FIXED_GRID.height - MIN_ZONE_SIZE
  ) {
    return `Row split must be between ${MIN_ZONE_SIZE} and ${FIXED_GRID.height - MIN_ZONE_SIZE}`;
  }
  return null;
}

export function layoutFromSplits(
  columnSplit: number,
  rowSplit: number,
  sourceZones: OfficeZone[],
): OfficeLayout {
  const splitError = validateSplits(columnSplit, rowSplit);
  if (splitError) {
    throw new Error(splitError);
  }
  const byId = new Map(sourceZones.map((zone) => [zone.id, zone]));
  const zone = (id: (typeof LAYOUT_ZONE_IDS)[number]): OfficeZone => {
    const existing = byId.get(id);
    const fallback = defaultZone(id);
    return {
      id,
      name: existing?.name ?? fallback.name,
      type: existing?.type ?? ZONE_TYPES[id],
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };
  };
  const width = FIXED_GRID.width;
  const height = FIXED_GRID.height;
  return {
    grid_dimensions: FIXED_GRID,
    zones: [
      {
        ...zone("fixed_desks"),
        bounds: { x: 0, y: 0, width: columnSplit, height: rowSplit },
      },
      {
        ...zone("meeting_room"),
        bounds: {
          x: columnSplit,
          y: 0,
          width: width - columnSplit,
          height: rowSplit,
        },
      },
      {
        ...zone("breakout_room"),
        bounds: {
          x: 0,
          y: rowSplit,
          width: columnSplit,
          height: height - rowSplit,
        },
      },
      {
        ...zone("testing_lab"),
        bounds: {
          x: columnSplit,
          y: rowSplit,
          width: width - columnSplit,
          height: height - rowSplit,
        },
      },
    ],
  };
}

export function extractSplits(layout: OfficeLayout): {
  columnSplit: number;
  rowSplit: number;
} {
  const desks = layout.zones.find((zone) => zone.id === "fixed_desks");
  return {
    columnSplit: desks?.bounds.width ?? 12,
    rowSplit: desks?.bounds.height ?? 8,
  };
}

export function validateOfficeLayout(layout: OfficeLayout): string | null {
  if (
    layout.grid_dimensions.width !== FIXED_GRID.width ||
    layout.grid_dimensions.height !== FIXED_GRID.height
  ) {
    return `Office grid must remain ${FIXED_GRID.width}×${FIXED_GRID.height}`;
  }
  if (layout.zones.length !== LAYOUT_ZONE_IDS.length) {
    return "Office must have exactly four zones";
  }
  for (const id of LAYOUT_ZONE_IDS) {
    if (!layout.zones.some((zone) => zone.id === id)) {
      return `Missing zone ${id}`;
    }
  }
  const splits = extractSplits(layout);
  const splitError = validateSplits(splits.columnSplit, splits.rowSplit);
  if (splitError) return splitError;
  const normalized = layoutFromSplits(splits.columnSplit, splits.rowSplit, layout.zones);
  for (const zone of layout.zones) {
    const expected = normalized.zones.find((entry) => entry.id === zone.id);
    if (!expected) continue;
    if (JSON.stringify(expected.bounds) !== JSON.stringify(zone.bounds)) {
      return "Zone bounds must tile the grid without gaps";
    }
    if (zone.name.trim().length === 0) {
      return "Zone names cannot be empty";
    }
  }
  return null;
}

function isInsideBounds(bounds: ZoneBounds, x: number, y: number): boolean {
  return (
    x >= bounds.x &&
    x < bounds.x + bounds.width &&
    y >= bounds.y &&
    y < bounds.y + bounds.height
  );
}

function agentNeedsReposition(
  layout: OfficeLayout,
  agent: RosterAgent,
): boolean {
  if (agent.spatial_state.status === "offline") return false;
  const zoneId = agentZoneToLayoutZoneId(agent.spatial_state.zone);
  const zone = layout.zones.find((entry) => entry.id === zoneId);
  if (!zone) return true;
  const { position_x, position_y } = agent.spatial_state;
  if (!isInsideBounds(zone.bounds, position_x, position_y)) {
    return true;
  }
  const zoneSlots = generateOfficeSlots(layout).filter(
    (slot) => slot.zoneId === zoneId,
  );
  return nearestSlot(zoneSlots, position_x, position_y) === null;
}

export function reconcileAgentPositions(
  layout: OfficeLayout,
  agents: RosterAgent[],
): Array<{ agentId: string; spatial: Partial<SpatialState> }> {
  const updates: Array<{ agentId: string; spatial: Partial<SpatialState> }> =
    [];
  const slots = generateOfficeSlots(layout);

  for (const agent of agents) {
    if (!agentNeedsReposition(layout, agent)) continue;
    const zoneId = agentZoneToLayoutZoneId(agent.spatial_state.zone);
    const zoneSlots = slots.filter((slot) => slot.zoneId === zoneId);
    const occupancy = slotOccupant(zoneSlots, agents, agent.id);
    const freeSlot = zoneSlots.find((slot) => !occupancy.has(slot.id));
    if (freeSlot) {
      updates.push({
        agentId: agent.id,
        spatial: {
          position_x: freeSlot.gridX,
          position_y: freeSlot.gridY,
        },
      });
      continue;
    }
    const position = positionInZone(layout, zoneId, 0);
    updates.push({
      agentId: agent.id,
      spatial: position,
    });
  }

  return updates;
}

export function updateZoneNames(
  layout: OfficeLayout,
  names: Partial<Record<string, string>>,
): OfficeLayout {
  const splits = extractSplits(layout);
  const zones = layout.zones.map((zone) => ({
    ...zone,
    name: names[zone.id]?.trim() || zone.name,
  }));
  return layoutFromSplits(splits.columnSplit, splits.rowSplit, zones);
}
