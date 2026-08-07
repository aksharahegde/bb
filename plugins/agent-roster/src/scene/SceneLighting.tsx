import { useEffect, useState } from "react";
import type { SceneTheme } from "./hooks/useSceneTheme.js";
import { localDayNightFactor } from "./day-night.js";
import { sceneLightLevels } from "./scene-settings.js";

export function SceneLighting({
  theme,
  dayNightFactor,
}: {
  theme: SceneTheme;
  dayNightFactor: number;
}) {
  const levels = sceneLightLevels(theme, dayNightFactor);
  const sky = `#${theme.floor
    .clone()
    .lerp(theme.primary, 0.08 + levels.warmth * 0.12)
    .getHexString()}`;
  const ground = `#${theme.floor
    .clone()
    .lerp(theme.ink, 0.12 + levels.warmth * 0.08)
    .getHexString()}`;

  return (
    <>
      <ambientLight intensity={levels.ambient} />
      <hemisphereLight
        args={[sky, ground, levels.hemisphere]}
        position={[0, 20, 0]}
      />
      <directionalLight
        position={[8, 12, 6]}
        intensity={levels.directional}
        color={`#${theme.floor.clone().lerp(theme.warning, levels.warmth * 0.25).getHexString()}`}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight
        position={[-6, 8, -4]}
        intensity={levels.directional * 0.25}
      />
    </>
  );
}

export function useDayNightFactor(): number {
  const [factor, setFactor] = useState(() => localDayNightFactor());

  useEffect(() => {
    const refresh = (): void => setFactor(localDayNightFactor());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return factor;
}
