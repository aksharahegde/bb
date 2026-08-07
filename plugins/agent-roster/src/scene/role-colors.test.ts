import { describe, expect, it } from "vitest";
import { Color } from "three";
import { roleColor } from "./role-colors.js";
import type { SceneTheme } from "./hooks/useSceneTheme.js";

function theme(): SceneTheme {
  return {
    floor: new Color("#f5f5f4"),
    floorZoneExecution: new Color("#dbeafe"),
    floorZoneCollaboration: new Color("#fef3c7"),
    floorZoneIdle: new Color("#e7e5e4"),
    desk: new Color("#d6d3d1"),
    monitorBezel: new Color("#78716c"),
    monitorScreen: new Color("#44403c"),
    chair: new Color("#a8a29e"),
    success: new Color("#16a34a"),
    warning: new Color("#ca8a04"),
    destructive: new Color("#dc2626"),
    primary: new Color("#2563eb"),
    muted: new Color("#a8a29e"),
    ink: new Color("#1c1917"),
  };
}

describe("roleColor", () => {
  it("returns a stable color for the same role", () => {
    const colors = theme();
    expect(roleColor(colors, "Debugger")).toBe(roleColor(colors, "Debugger"));
  });

  it("returns a hex color string", () => {
    expect(roleColor(theme(), "Reviewer")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
