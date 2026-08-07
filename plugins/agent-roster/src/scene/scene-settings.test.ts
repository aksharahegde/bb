import { describe, expect, it } from "vitest";
import { Color } from "three";
import { sceneLightLevels } from "./scene-settings.js";
import type { SceneTheme } from "./hooks/useSceneTheme.js";

function theme(floor: string): SceneTheme {
  const floorColor = new Color(floor);
  return {
    floor: floorColor,
    floorZoneExecution: floorColor,
    floorZoneCollaboration: floorColor,
    floorZoneIdle: floorColor,
    desk: floorColor,
    monitorBezel: floorColor,
    monitorScreen: floorColor,
    chair: floorColor,
    success: new Color("#16a34a"),
    warning: new Color("#ca8a04"),
    destructive: new Color("#dc2626"),
    primary: new Color("#2563eb"),
    muted: new Color("#a8a29e"),
    ink: new Color("#1c1917"),
  };
}

describe("sceneLightLevels", () => {
  it("dims lights on darker floors", () => {
    const bright = sceneLightLevels(theme("#f5f5f4"));
    const dark = sceneLightLevels(theme("#1c1917"));
    expect(dark.directional).toBeLessThan(bright.directional);
  });
});
