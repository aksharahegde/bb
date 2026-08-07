import type { SceneTheme } from "./hooks/useSceneTheme.js";

export interface SceneSettings {
  showZoneLabels: boolean;
  showParticles: boolean;
  showMovementTrails: boolean;
}

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  showZoneLabels: true,
  showParticles: true,
  showMovementTrails: true,
};

export function sceneLightLevels(
  theme: SceneTheme,
  dayNightFactor = 1,
): {
  ambient: number;
  directional: number;
  hemisphere: number;
  warmth: number;
} {
  const luminance =
    theme.floor.r * 0.2126 +
    theme.floor.g * 0.7152 +
    theme.floor.b * 0.0722;
  const themeFactor = luminance > 0.45 ? 1 : 0.82;
  const daylight = Math.max(0.35, Math.min(1, dayNightFactor));
  const warmth = 1 - daylight;
  return {
    ambient: 0.42 * themeFactor * (0.7 + daylight * 0.3),
    directional: 1.05 * themeFactor * (0.55 + daylight * 0.45),
    hemisphere: 0.28 * themeFactor * (0.65 + daylight * 0.35),
    warmth,
  };
}
