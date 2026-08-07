import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Line,
  LineDashedMaterial,
  Vector3,
} from "three";

export function createMovementTrail(color: string): Line {
  const positions = new Float32Array(6);
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
}

export function syncMovementTrail(
  line: Line,
  group: Group | null,
  destination: Vector3,
  enabled: boolean,
  reducedMotion: boolean,
): void {
  if (!enabled || reducedMotion || !group) {
    line.visible = false;
    return;
  }

  const distance = group.position.distanceTo(destination);
  if (distance < 0.12) {
    line.visible = false;
    return;
  }

  const position = line.geometry.getAttribute("position") as BufferAttribute;
  position.setXYZ(0, group.position.x, 0.06, group.position.z);
  position.setXYZ(1, destination.x, 0.06, destination.z);
  position.needsUpdate = true;
  line.computeLineDistances();
  line.visible = true;
}
