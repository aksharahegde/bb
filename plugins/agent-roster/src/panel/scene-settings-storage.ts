import {
  DEFAULT_SCENE_SETTINGS,
  type SceneSettings,
} from "../scene/scene-settings.js";

const STORAGE_KEY = "bb-agent-roster-scene-settings";

export function loadStoredSceneSettings(): SceneSettings {
  if (typeof window === "undefined") return DEFAULT_SCENE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCENE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SceneSettings>;
    return {
      showZoneLabels:
        parsed.showZoneLabels ?? DEFAULT_SCENE_SETTINGS.showZoneLabels,
      showParticles:
        parsed.showParticles ?? DEFAULT_SCENE_SETTINGS.showParticles,
      showMovementTrails:
        parsed.showMovementTrails ?? DEFAULT_SCENE_SETTINGS.showMovementTrails,
    };
  } catch {
    return DEFAULT_SCENE_SETTINGS;
  }
}

export function saveStoredSceneSettings(settings: SceneSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
