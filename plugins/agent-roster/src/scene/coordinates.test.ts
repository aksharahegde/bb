import { describe, expect, it } from "vitest";
import { gridToWorld, worldToGrid, zoneCenter } from "./coordinates.js";

const GRID = { width: 24, height: 16 };

describe("coordinates", () => {
  it("maps grid origin to negative world quadrant", () => {
    expect(gridToWorld(0, 0, GRID)).toEqual([-11.5, 0, -7.5]);
  });

  it("round-trips grid coordinates", () => {
    const point = gridToWorld(5, 8, GRID);
    const back = worldToGrid(point[0], point[2], GRID);
    expect(back).toEqual({ x: 5, y: 8 });
  });

  it("computes zone center", () => {
    const center = zoneCenter({ x: 0, y: 0, width: 12, height: 8 }, GRID);
    expect(center[0]).toBeCloseTo(-5.5);
    expect(center[2]).toBeCloseTo(-3.5);
  });
});
