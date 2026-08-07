import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, type Mesh } from "three";
import { RoundedBox } from "@react-three/drei";
import type { AgentStatus } from "../../types.js";
import { DESK_HEIGHT, MONITOR_HEIGHT } from "../constants.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { statusEmissiveColor } from "../materials.js";

interface WorkstationProps {
  theme: SceneTheme;
  status: AgentStatus;
  reducedMotion: boolean;
  dimmed?: boolean;
  screenRef?: React.RefObject<Mesh | null>;
}

export function Workstation({
  theme,
  status,
  reducedMotion,
  dimmed = false,
  screenRef,
}: WorkstationProps) {
  const internalRef = useRef<Mesh>(null);
  const monitorRef = screenRef ?? internalRef;
  const opacity = dimmed ? 0.55 : 1;

  useFrame((state) => {
    const mesh = monitorRef.current;
    if (!mesh || reducedMotion) return;
    const material = mesh.material;
    if (!material || Array.isArray(material)) return;
    if (!(material instanceof MeshStandardMaterial)) return;
    const emissive = statusEmissiveColor(theme, status);
    if (!emissive) {
      material.emissive.set("#000000");
      material.emissiveIntensity = 0;
      return;
    }
    material.emissive.set(emissive);
    const speed = status === "thinking" ? 1.2 : 2.4;
    material.emissiveIntensity =
      status === "error"
        ? 0.85
        : 0.35 + Math.sin(state.clock.elapsedTime * speed) * 0.25;
  });

  return (
    <group>
      <RoundedBox
        args={[1.4, 0.08, 0.7]}
        radius={0.03}
        smoothness={4}
        position={[0, DESK_HEIGHT, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={theme.desk} transparent opacity={opacity} />
      </RoundedBox>
      {[
        [-0.6, DESK_HEIGHT / 2, -0.28],
        [0.6, DESK_HEIGHT / 2, -0.28],
        [-0.6, DESK_HEIGHT / 2, 0.28],
        [0.6, DESK_HEIGHT / 2, 0.28],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, DESK_HEIGHT, 0.06]} />
          <meshStandardMaterial color={theme.desk} transparent opacity={opacity} />
        </mesh>
      ))}
      <RoundedBox
        args={[0.15, 0.2, 0.1]}
        radius={0.02}
        smoothness={3}
        position={[0, DESK_HEIGHT + 0.12, -0.22]}
        castShadow
      >
        <meshStandardMaterial
          color={theme.monitorBezel}
          transparent
          opacity={opacity}
        />
      </RoundedBox>
      <mesh
        ref={monitorRef}
        position={[0, MONITOR_HEIGHT, -0.22]}
        castShadow
      >
        <boxGeometry args={[0.9, 0.55, 0.04]} />
        <meshStandardMaterial
          color={theme.monitorScreen}
          emissive="#000000"
          emissiveIntensity={0}
          transparent
          opacity={opacity}
        />
      </mesh>
      <RoundedBox
        args={[0.5, 0.08, 0.5]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.45, 0.45]}
        castShadow
      >
        <meshStandardMaterial color={theme.chair} transparent opacity={opacity} />
      </RoundedBox>
      <RoundedBox
        args={[0.5, 0.5, 0.08]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.75, 0.62]}
        castShadow
      >
        <meshStandardMaterial color={theme.chair} transparent opacity={opacity} />
      </RoundedBox>
    </group>
  );
}
