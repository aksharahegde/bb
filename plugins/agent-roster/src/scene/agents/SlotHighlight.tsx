import { gridToWorld } from "../coordinates.js";
import type { FurnitureSlot } from "../slots.js";

export function SlotHighlight({
  slot,
  layout,
  tone,
}: {
  slot: FurnitureSlot | null;
  layout: { grid_dimensions: { width: number; height: number } };
  tone: "valid" | "invalid";
}) {
  if (!slot) return null;
  const [x, , z] = gridToWorld(slot.gridX, slot.gridY, layout.grid_dimensions);
  const color =
    tone === "valid"
      ? "var(--success, #22c55e)"
      : "var(--destructive, #ef4444)";

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.05, z]}>
      <ringGeometry args={[0.45, 0.65, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.65} />
    </mesh>
  );
}
