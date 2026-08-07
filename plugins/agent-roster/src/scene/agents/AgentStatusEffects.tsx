import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { AgentStatus } from "../../types.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { statusRingColor } from "../materials.js";

export function AgentStatusEffects({
  theme,
  status,
  selected,
  reducedMotion,
}: {
  theme: SceneTheme;
  status: AgentStatus;
  selected: boolean;
  reducedMotion: boolean;
}) {
  const ringRef = useRef<Mesh>(null);
  const ringColor = statusRingColor(theme, status);

  useFrame((state) => {
    const ring = ringRef.current;
    if (!ring || !ringColor) return;
    const material = ring.material;
    if (!material || Array.isArray(material) || material.type !== "MeshBasicMaterial") {
      return;
    }
    if (reducedMotion) {
      material.opacity = 0.55;
      return;
    }
    material.opacity =
      0.35 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
  });

  if (!ringColor && !selected) return null;

  return (
    <group>
      {ringColor ? (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.78, 0.88, 32]} />
          <meshBasicMaterial
            color={`#${theme.primary.getHexString()}`}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}
