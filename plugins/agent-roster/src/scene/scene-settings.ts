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

export function sceneLightLevels(theme: SceneTheme): {
  ambient: number;
  directional: number;
  hemisphere: number;
} {
  const luminance =
    theme.floor.r * 0.2126 +
    theme.floor.g * 0.7152 +
    theme.floor.b * 0.0722;
  const dayFactor = luminance > 0.45 ? 1 : 0.82;
  return {
    ambient: 0.42 * dayFactor,
    directional: 1.05 * dayFactor,
    hemisphere: 0.28 * dayFactor,
  };
}
