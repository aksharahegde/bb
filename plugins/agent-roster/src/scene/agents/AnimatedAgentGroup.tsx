import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import { Group, Vector3 } from "three";
import { MovementTrail } from "./MovementTrail.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function AnimatedAgentGroup({
  target,
  reducedMotion,
  showMovementTrails,
  theme,
  children,
}: {
  target: [number, number, number];
  reducedMotion: boolean;
  showMovementTrails: boolean;
  theme: SceneTheme;
  children: ReactNode;
}) {
  const groupRef = useRef<Group>(null);
  const destination = useRef(new Vector3(...target));

  useEffect(() => {
    destination.current.set(...target);
    if (reducedMotion && groupRef.current) {
      groupRef.current.position.set(...target);
    }
  }, [target, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || reducedMotion) return;
    group.position.lerp(destination.current, Math.min(1, delta * 6));
  });

  return (
    <>
      <MovementTrail
        groupRef={groupRef}
        destination={destination}
        theme={theme}
        enabled={showMovementTrails}
        reducedMotion={reducedMotion}
      />
      <group ref={groupRef} position={target}>
        {children}
      </group>
    </>
  );
}
