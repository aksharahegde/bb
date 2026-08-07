import type { SceneTheme } from "./hooks/useSceneTheme.js";
import { sceneLightLevels } from "./scene-settings.js";

export function SceneLighting({ theme }: { theme: SceneTheme }) {
  const levels = sceneLightLevels(theme);
  const sky = `#${theme.floor.clone().lerp(theme.primary, 0.08).getHexString()}`;
  const ground = `#${theme.floor.clone().lerp(theme.ink, 0.12).getHexString()}`;

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
