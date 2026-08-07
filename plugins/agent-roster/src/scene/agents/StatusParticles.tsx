import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points } from "three";
import type { AgentStatus } from "../../types.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { statusEmissiveColor } from "../materials.js";

const PARTICLE_COUNT = 12;

export function StatusParticles({
  status,
  theme,
  reducedMotion,
}: {
  status: AgentStatus;
  theme: SceneTheme;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<Points>(null);
  const color = statusEmissiveColor(theme, status);
  const active = status === "working" || status === "thinking";

  const geometry = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * 0.45;
      positions[index * 3 + 1] = 0.2 + (index % 3) * 0.08;
      positions[index * 3 + 2] = Math.sin(angle) * 0.45;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points || !active || reducedMotion) return;
    points.rotation.y = state.clock.elapsedTime * 0.6;
  });

  if (!active || !color) return null;

  return (
    <points ref={pointsRef} geometry={geometry} position={[0, 1.1, 0.15]}>
      <pointsMaterial
        color={color}
        size={0.06}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
