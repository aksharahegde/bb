import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import type { CollaborationGroup, OfficeLayout, RosterAgent } from "../types.js";
import { AnimatedAgentGroup } from "./agents/AnimatedAgentGroup.js";
import { AgentStation } from "./agents/AgentStation.js";
import { CollaborationBeams } from "./agents/CollaborationBeams.js";
import { gridToWorld } from "./coordinates.js";
import { DragController } from "./DragController.js";
import { DragProvider } from "./DragContext.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { useSceneTheme } from "./hooks/useSceneTheme.js";
import { OfficeCamera } from "./OfficeCamera.js";
import { OfficeFloor, ZoneDecorations } from "./OfficeFloor.js";
import { SceneLighting } from "./SceneLighting.js";
import type { SceneSettings } from "./scene-settings.js";

export interface OfficeSceneProps {
  layout: OfficeLayout;
  agents: RosterAgent[];
  collaborationGroups: CollaborationGroup[];
  selectedAgentId: string | null;
  focusAgentId: string | null;
  sceneSettings: SceneSettings;
  onSelectAgent: (agent: RosterAgent) => void;
  onFocusAgent: (agent: RosterAgent) => void;
  onDeselect: () => void;
  onMoveAgent: (agentId: string, x: number, y: number) => void;
}

export default function OfficeScene({
  layout,
  agents,
  collaborationGroups,
  selectedAgentId,
  focusAgentId,
  sceneSettings,
  onSelectAgent,
  onFocusAgent,
  onDeselect,
  onMoveAgent,
}: OfficeSceneProps) {
  const theme = useSceneTheme();
  const reducedMotion = useReducedMotion();

  const handleMove = useCallback(
    (agentId: string, x: number, y: number) => {
      onMoveAgent(agentId, x, y);
    },
    [onMoveAgent],
  );

  const background = useMemo(
    () => `#${theme.floor.clone().lerp(theme.ink, 0.04).getHexString()}`,
    [theme.floor, theme.ink],
  );

  const focusTarget = useMemo(() => {
    const agent = agents.find((entry) => entry.id === focusAgentId);
    if (!agent) return null;
    return gridToWorld(
      agent.spatial_state.position_x,
      agent.spatial_state.position_y,
      layout.grid_dimensions,
    );
  }, [agents, focusAgentId, layout.grid_dimensions]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      className="h-full w-full"
      gl={{ antialias: true }}
      onPointerMissed={onDeselect}
    >
      <color attach="background" args={[background]} />
      <OfficeCamera layout={layout} focusTarget={focusTarget} />
      <SceneLighting theme={theme} />
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.35}
        scale={30}
        blur={2.5}
        far={12}
      />
      <DragProvider>
        <OfficeFloor
          layout={layout}
          theme={theme}
          showZoneLabels={sceneSettings.showZoneLabels}
        />
        <ZoneDecorations layout={layout} theme={theme} />
        <CollaborationBeams
          layout={layout}
          agents={agents}
          groups={collaborationGroups}
          theme={theme}
          reducedMotion={reducedMotion}
        />
        <DragController
          layout={layout}
          agents={agents}
          reducedMotion={reducedMotion}
          onMoveAgent={handleMove}
        />
        {agents.map((agent) => {
          const position = gridToWorld(
            agent.spatial_state.position_x,
            agent.spatial_state.position_y,
            layout.grid_dimensions,
          );
          return (
            <AnimatedAgentGroup
              key={agent.id}
              target={position}
              reducedMotion={reducedMotion}
              showMovementTrails={sceneSettings.showMovementTrails}
              theme={theme}
            >
              <AgentStation
                agent={agent}
                theme={theme}
                selected={selectedAgentId === agent.id}
                reducedMotion={reducedMotion}
                showParticles={sceneSettings.showParticles}
                onSelect={onSelectAgent}
                onFocus={onFocusAgent}
              />
            </AnimatedAgentGroup>
          );
        })}
      </DragProvider>
    </Canvas>
  );
}
