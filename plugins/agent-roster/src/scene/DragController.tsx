import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import type { RosterAgent } from "../types.js";
import { worldToGrid } from "./coordinates.js";
import type { OfficeLayout } from "../types.js";
import {
  generateOfficeSlots,
  nearestSlot,
  slotOccupant,
  type FurnitureSlot,
} from "./slots.js";
import { SlotHighlight } from "./agents/SlotHighlight.js";

const raycaster = new Raycaster();
const pointer = new Vector2();
const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersection = new Vector3();

export function DragController({
  layout,
  agents,
  reducedMotion,
  onMoveAgent,
}: {
  layout: OfficeLayout;
  agents: RosterAgent[];
  reducedMotion: boolean;
  onMoveAgent: (agentId: string, x: number, y: number) => void;
}) {
  const { camera, gl } = useThree();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewSlot, setPreviewSlot] = useState<FurnitureSlot | null>(null);
  const [slotValid, setSlotValid] = useState(true);
  const slots = useRef(generateOfficeSlots(layout)).current;

  useEffect(() => {
    (window as Window & { __rosterStartDrag?: (id: string) => void }).__rosterStartDrag =
      (agentId: string) => {
        const agent = agents.find((entry) => entry.id === agentId);
        if (!agent) return;
        if (
          agent.spatial_state.status === "working" ||
          agent.spatial_state.status === "thinking"
        ) {
          return;
        }
        setDraggingId(agentId);
        gl.domElement.style.cursor = "grabbing";
      };
    return () => {
      delete (window as Window & { __rosterStartDrag?: (id: string) => void })
        .__rosterStartDrag;
    };
  }, [agents, gl.domElement]);

  useEffect(() => {
    if (!draggingId) return;

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(floorPlane, intersection)) return;
      const grid = worldToGrid(
        intersection.x,
        intersection.z,
        layout.grid_dimensions,
      );
      const slot = nearestSlot(slots, grid.x, grid.y);
      setPreviewSlot(slot);
      if (!slot) {
        setSlotValid(false);
        return;
      }
      const occupancy = slotOccupant(slots, agents, draggingId);
      setSlotValid(!occupancy.has(slot.id));
    };

    const handlePointerUp = (): void => {
      if (previewSlot && slotValid) {
        onMoveAgent(draggingId, previewSlot.gridX, previewSlot.gridY);
      }
      setDraggingId(null);
      setPreviewSlot(null);
      gl.domElement.style.cursor = "auto";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    draggingId,
    previewSlot,
    slotValid,
    agents,
    slots,
    layout.grid_dimensions,
    camera,
    gl.domElement,
    onMoveAgent,
  ]);

  if (!draggingId) return null;

  return (
    <SlotHighlight
      slot={previewSlot}
      layout={layout}
      tone={slotValid ? "valid" : "invalid"}
    />
  );
}

export function startAgentDrag(agentId: string): void {
  const starter = (window as Window & { __rosterStartDrag?: (id: string) => void })
    .__rosterStartDrag;
  starter?.(agentId);
}
