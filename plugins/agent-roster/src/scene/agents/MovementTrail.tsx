import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, type RefObject } from "react";
import { Vector3, type Group } from "three";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function MovementTrail({
  groupRef,
  destination,
  theme,
  enabled,
  reducedMotion,
}: {
  groupRef: RefObject<Group | null>;
  destination: React.RefObject<Vector3>;
  theme: SceneTheme;
  enabled: boolean;
  reducedMotion: boolean;
}) {
  const [segment, setSegment] = useState<
    [[number, number, number], [number, number, number]] | null
  >(null);
  const lastVisible = useRef(false);

  useFrame(() => {
    if (!enabled || reducedMotion) {
      if (lastVisible.current) setSegment(null);
      lastVisible.current = false;
      return;
    }
    const group = groupRef.current;
    if (!group) return;
    const distance = group.position.distanceTo(destination.current);
    if (distance < 0.12) {
      if (lastVisible.current) setSegment(null);
      lastVisible.current = false;
      return;
    }
    lastVisible.current = true;
    setSegment([
      [group.position.x, 0.06, group.position.z],
      [destination.current.x, 0.06, destination.current.z],
    ]);
  });

  if (!segment) return null;

  return (
    <Line
      points={segment}
      color={`#${theme.muted.getHexString()}`}
      lineWidth={1}
      dashed
      dashSize={0.25}
      gapSize={0.15}
      transparent
      opacity={0.65}
    />
  );
}
