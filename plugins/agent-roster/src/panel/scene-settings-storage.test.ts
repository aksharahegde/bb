import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCENE_SETTINGS } from "../scene/scene-settings.js";
import {
  loadStoredSceneSettings,
  saveStoredSceneSettings,
} from "./scene-settings-storage.js";

describe("scene settings storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        clear: () => store.clear(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults when nothing is stored", () => {
    expect(loadStoredSceneSettings()).toEqual(DEFAULT_SCENE_SETTINGS);
  });

  it("round-trips scene settings", () => {
    saveStoredSceneSettings({
      showZoneLabels: false,
      showParticles: true,
      showMovementTrails: false,
    });
    expect(loadStoredSceneSettings()).toEqual({
      showZoneLabels: false,
      showParticles: true,
      showMovementTrails: false,
    });
  });
});
