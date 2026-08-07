import { useFrame } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineDashedMaterial,
  Vector3,
  type Group,
} from "three";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function MovementTrail({
  groupRef,
  destination,
  theme,
  enabled,
  reducedMotion,
}: {
  groupRef: RefObject<Group | null>;
  destination: RefObject<Vector3>;
  theme: SceneTheme;
  enabled: boolean;
  reducedMotion: boolean;
}) {
  const positions = useMemo(() => new Float32Array(6), []);
  const color = useMemo(
    () => `#${theme.muted.getHexString()}`,
    [theme.muted],
  );
  const line = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new LineDashedMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      dashSize: 0.25,
      gapSize: 0.15,
    });
    const trail = new Line(geometry, material);
    trail.frustumCulled = false;
    trail.visible = false;
    trail.computeLineDistances();
    return trail;
  }, [color, positions]);

  useFrame(() => {
    if (!enabled || reducedMotion) {
      line.visible = false;
      return;
    }

    const group = groupRef.current;
    if (!group) return;

    const distance = group.position.distanceTo(destination.current);
    if (distance < 0.12) {
      line.visible = false;
      return;
    }

    const position = line.geometry.getAttribute("position") as BufferAttribute;
    position.setXYZ(0, group.position.x, 0.06, group.position.z);
    position.setXYZ(
      1,
      destination.current.x,
      0.06,
      destination.current.z,
    );
    position.needsUpdate = true;
    line.computeLineDistances();
    line.visible = true;
  });

  if (!enabled || reducedMotion) return null;

  return <primitive object={line} />;
}
