import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function PlantSway({
  position,
  theme,
  reducedMotion,
}: {
  position: [number, number, number];
  theme: SceneTheme;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || reducedMotion) return;
    group.rotation.z = Math.sin(state.clock.elapsedTime * 0.9 + position[0]) * 0.05;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.22, 8]} />
        <meshStandardMaterial color={theme.desk} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshStandardMaterial color={theme.success} roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.52, 0.05]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color={theme.success} roughness={0.8} />
      </mesh>
    </group>
  );
}
