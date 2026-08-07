import type { OfficeLayout, OfficeZone } from "../types.js";

export type SlotKind = "desk" | "conference_chair" | "lounge_spot" | "lab_stool";

export interface FurnitureSlot {
  id: string;
  zoneId: string;
  gridX: number;
  gridY: number;
  kind: SlotKind;
}

const ZONE_SLOT_KIND: Record<string, SlotKind> = {
  fixed_desks: "desk",
  meeting_room: "conference_chair",
  breakout_room: "lounge_spot",
  testing_lab: "lab_stool",
};

export function generateSlotsForZone(zone: OfficeZone): FurnitureSlot[] {
  const kind = ZONE_SLOT_KIND[zone.id] ?? "desk";
  const slots: FurnitureSlot[] = [];
  let index = 0;
  for (
    let y = zone.bounds.y + 1;
    y < zone.bounds.y + zone.bounds.height - 1;
    y += 2
  ) {
    for (
      let x = zone.bounds.x + 1;
      x < zone.bounds.x + zone.bounds.width - 1;
      x += 2
    ) {
      slots.push({
        id: `${zone.id}-${index}`,
        zoneId: zone.id,
        gridX: x,
        gridY: y,
        kind,
      });
      index += 1;
    }
  }
  return slots;
}

export function generateOfficeSlots(layout: OfficeLayout): FurnitureSlot[] {
  return layout.zones.flatMap((zone) => generateSlotsForZone(zone));
}

export function nearestSlot(
  slots: FurnitureSlot[],
  gridX: number,
  gridY: number,
): FurnitureSlot | null {
  if (slots.length === 0) return null;
  let best: FurnitureSlot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const distance = Math.hypot(slot.gridX - gridX, slot.gridY - gridY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }
  return bestDistance <= 1.5 ? best : null;
}

export function slotOccupant(
  slots: FurnitureSlot[],
  agents: Array<{ id: string; spatial_state: { position_x: number; position_y: number } }>,
  ignoreAgentId?: string,
): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const agent of agents) {
    if (ignoreAgentId && agent.id === ignoreAgentId) continue;
    const slot = nearestSlot(
      slots,
      agent.spatial_state.position_x,
      agent.spatial_state.position_y,
    );
    if (slot) occupancy.set(slot.id, agent.id);
  }
  return occupancy;
}
