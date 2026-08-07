import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { OfficeLayout, RosterAgent } from "../types.js";
import { AgentStation } from "./agents/AgentStation.js";
import { gridToWorld } from "./coordinates.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { useSceneTheme } from "./hooks/useSceneTheme.js";
import { OfficeCamera } from "./OfficeCamera.js";
import { OfficeFloor, ZoneDecorations } from "./OfficeFloor.js";

export interface OfficeSceneProps {
  layout: OfficeLayout;
  agents: RosterAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: RosterAgent) => void;
  onDeselect: () => void;
}

export default function OfficeScene({
  layout,
  agents,
  selectedAgentId,
  onSelectAgent,
  onDeselect,
}: OfficeSceneProps) {
  const theme = useSceneTheme();
  const reducedMotion = useReducedMotion();

  const cameraTarget = useMemo<[number, number, number]>(() => [0, 0, 0], []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      className="h-full w-full"
      gl={{ antialias: true }}
      onPointerMissed={onDeselect}
    >
      <color attach="background" args={[`#${theme.floor.clone().lerp(theme.ink, 0.04).getHexString()}`]} />
      <OfficeCamera target={cameraTarget} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.35}
        scale={30}
        blur={2.5}
        far={12}
      />
      <OfficeFloor layout={layout} theme={theme} />
      <ZoneDecorations layout={layout} theme={theme} />
      {agents.map((agent) => {
        const [x, , z] = gridToWorld(
          agent.spatial_state.position_x,
          agent.spatial_state.position_y,
          layout.grid_dimensions,
        );
        return (
          <group key={agent.id} position={[x, 0, z]}>
            <AgentStation
              agent={agent}
              theme={theme}
              selected={selectedAgentId === agent.id}
              reducedMotion={reducedMotion}
              onSelect={onSelectAgent}
            />
          </group>
        );
      })}
    </Canvas>
  );
}
