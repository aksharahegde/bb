import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
} from "three";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

const STEAM_COUNT = 8;

export function CoffeeSteam({
  position,
  theme,
  reducedMotion,
}: {
  position: [number, number, number];
  theme: SceneTheme;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<Points>(null);
  const offsets = useMemo(
    () =>
      Array.from({ length: STEAM_COUNT }, (_, index) => ({
        phase: index * 0.7,
        x: (index % 3) * 0.04 - 0.04,
        z: Math.floor(index / 3) * 0.04 - 0.02,
      })),
    [],
  );

  const geometry = useMemo(() => {
    const positions = new Float32Array(STEAM_COUNT * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points || reducedMotion) return;
    const attr = points.geometry.getAttribute("position") as BufferAttribute;
    const time = state.clock.elapsedTime;
    for (let index = 0; index < STEAM_COUNT; index += 1) {
      const offset = offsets[index]!;
      const cycle = (time * 0.55 + offset.phase) % 1;
      attr.setXYZ(
        index,
        offset.x + Math.sin(time + offset.phase) * 0.02,
        0.12 + cycle * 0.35,
        offset.z + Math.cos(time * 0.8 + offset.phase) * 0.02,
      );
    }
    attr.needsUpdate = true;
  });

  if (reducedMotion) return null;

  return (
    <points ref={pointsRef} geometry={geometry} position={position}>
      <pointsMaterial
        color={`#${theme.muted.getHexString()}`}
        size={0.05}
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
