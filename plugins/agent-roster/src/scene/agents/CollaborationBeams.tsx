import { Line } from "@react-three/drei";
import { useMemo } from "react";
import type { CollaborationGroup, OfficeLayout, RosterAgent } from "../../types.js";
import { gridToWorld } from "../coordinates.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function CollaborationBeams({
  layout,
  agents,
  groups,
  theme,
  reducedMotion,
}: {
  layout: OfficeLayout;
  agents: RosterAgent[];
  groups: CollaborationGroup[];
  theme: SceneTheme;
  reducedMotion: boolean;
}) {
  const agentPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const agent of agents) {
      map.set(
        agent.id,
        gridToWorld(
          agent.spatial_state.position_x,
          agent.spatial_state.position_y,
          layout.grid_dimensions,
        ),
      );
    }
    return map;
  }, [agents, layout.grid_dimensions]);

  const segments = useMemo(() => {
    const lines: Array<[[number, number, number], [number, number, number]]> = [];
    for (const group of groups) {
      const positions = group.agent_ids
        .map((id) => agentPositions.get(id))
        .filter((position): position is [number, number, number] => !!position);
      if (positions.length < 2) continue;
      const hub = positions[0]!;
      for (let index = 1; index < positions.length; index += 1) {
        const target = positions[index]!;
        lines.push([
          [hub[0], 1.2, hub[2]],
          [target[0], 1.2, target[2]],
        ]);
      }
    }
    return lines;
  }, [agentPositions, groups]);

  if (segments.length === 0) return null;

  return (
    <group>
      {segments.map((segment, index) => (
        <Line
          key={index}
          points={segment}
          color={`#${theme.success.getHexString()}`}
          lineWidth={reducedMotion ? 1 : 2}
          transparent
          opacity={0.75}
        />
      ))}
    </group>
  );
}
