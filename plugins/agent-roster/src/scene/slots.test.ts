import { describe, expect, it } from "vitest";
import { DEFAULT_OFFICE_LAYOUT } from "../spatial.js";
import { generateOfficeSlots, nearestSlot, slotOccupant } from "./slots.js";

describe("slots", () => {
  it("generates slots for every zone", () => {
    const slots = generateOfficeSlots(DEFAULT_OFFICE_LAYOUT);
    expect(slots.length).toBeGreaterThan(8);
    expect(slots.some((slot) => slot.zoneId === "fixed_desks")).toBe(true);
    expect(slots.some((slot) => slot.zoneId === "meeting_room")).toBe(true);
  });

  it("finds nearest slot within snap distance", () => {
    const slots = generateOfficeSlots(DEFAULT_OFFICE_LAYOUT);
    const slot = nearestSlot(slots, 1, 1);
    expect(slot).not.toBeNull();
    expect(slot?.gridX).toBe(1);
    expect(slot?.gridY).toBe(1);
  });

  it("tracks slot occupancy", () => {
    const slots = generateOfficeSlots(DEFAULT_OFFICE_LAYOUT);
    const occupancy = slotOccupant(slots, [
      {
        id: "agent-a",
        spatial_state: { position_x: 1, position_y: 1 },
      },
    ]);
    expect(occupancy.size).toBe(1);
  });
});
