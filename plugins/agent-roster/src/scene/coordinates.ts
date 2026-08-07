import { CELL_SIZE } from "./constants.js";

export interface GridDimensions {
  width: number;
  height: number;
}

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function gridToWorld(
  x: number,
  y: number,
  grid: GridDimensions,
): [number, number, number] {
  const worldX = (x - grid.width / 2 + 0.5) * CELL_SIZE;
  const worldZ = (y - grid.height / 2 + 0.5) * CELL_SIZE;
  return [worldX, 0, worldZ];
}

export function worldToGrid(
  worldX: number,
  worldZ: number,
  grid: GridDimensions,
): { x: number; y: number } {
  const x = Math.round(worldX / CELL_SIZE + grid.width / 2 - 0.5);
  const y = Math.round(worldZ / CELL_SIZE + grid.height / 2 - 0.5);
  return {
    x: Math.max(0, Math.min(grid.width - 1, x)),
    y: Math.max(0, Math.min(grid.height - 1, y)),
  };
}

export function zoneCenter(
  bounds: ZoneBounds,
  grid: GridDimensions,
): [number, number, number] {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return gridToWorld(centerX, centerY, grid);
}

export function zoneWorldSize(bounds: ZoneBounds): { width: number; depth: number } {
  return {
    width: bounds.width * CELL_SIZE,
    depth: bounds.height * CELL_SIZE,
  };
}
