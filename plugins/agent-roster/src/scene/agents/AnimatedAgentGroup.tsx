import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Group, Vector3 } from "three";
import {
  createMovementTrail,
  syncMovementTrail,
} from "./movement-trail.js";
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
  const trailColor = useMemo(
    () => `#${theme.muted.getHexString()}`,
    [theme.muted],
  );
  const trailLine = useMemo(
    () => createMovementTrail(trailColor),
    [trailColor],
  );

  useEffect(() => {
    destination.current.set(...target);
    if (reducedMotion && groupRef.current) {
      groupRef.current.position.set(...target);
    }
  }, [target, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (group && !reducedMotion) {
      group.position.lerp(destination.current, Math.min(1, delta * 6));
    }
    syncMovementTrail(
      trailLine,
      group,
      destination.current,
      showMovementTrails,
      reducedMotion,
    );
  });

  return (
    <>
      {showMovementTrails && !reducedMotion ? (
        <primitive object={trailLine} />
      ) : null}
      <group ref={groupRef} position={target}>
        {children}
      </group>
    </>
  );
}
