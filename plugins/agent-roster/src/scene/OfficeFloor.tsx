import { Text } from "@react-three/drei";
import type { OfficeLayout, ZoneType } from "../types.js";
import { zoneCenter, zoneWorldSize } from "./coordinates.js";
import { ConferenceTable } from "./furniture/ConferenceTable.js";
import { LabBench } from "./furniture/LabBench.js";
import { LoungeCluster } from "./furniture/LoungeCluster.js";
import type { SceneTheme } from "./hooks/useSceneTheme.js";

function zoneFloorColor(theme: SceneTheme, type: ZoneType): string {
  switch (type) {
    case "execution":
      return `#${theme.floorZoneExecution.getHexString()}`;
    case "collaboration":
      return `#${theme.floorZoneCollaboration.getHexString()}`;
    case "idle_pool":
      return `#${theme.floorZoneIdle.getHexString()}`;
  }
}

export function OfficeFloor({
  layout,
  theme,
  showZoneLabels,
}: {
  layout: OfficeLayout;
  theme: SceneTheme;
  showZoneLabels: boolean;
}) {
  const { width, height } = layout.grid_dimensions;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 1.05, height * 1.05]} />
        <meshStandardMaterial color={theme.floor} />
      </mesh>
      {layout.zones.map((zone) => {
        const center = zoneCenter(zone.bounds, layout.grid_dimensions);
        const size = zoneWorldSize(zone.bounds);
        return (
          <group key={zone.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[center[0], 0.01, center[2]]}
              receiveShadow
            >
              <planeGeometry args={[size.width * 0.96, size.depth * 0.96]} />
              <meshStandardMaterial
                color={zoneFloorColor(theme, zone.type)}
                transparent
                opacity={0.9}
              />
            </mesh>
            <Text
              visible={showZoneLabels}
              position={[center[0], 0.15, center[2] - size.depth / 2 + 0.6]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.35}
              color={`#${theme.muted.getHexString()}`}
              anchorX="center"
              anchorY="middle"
              maxWidth={size.width * 0.9}
            >
              {zone.name.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export function ZoneDecorations({
  layout,
  theme,
}: {
  layout: OfficeLayout;
  theme: SceneTheme;
}) {
  return (
    <group>
      {layout.zones.map((zone) => {
        const center = zoneCenter(zone.bounds, layout.grid_dimensions);
        return (
          <group key={`decor-${zone.id}`} position={[center[0], 0, center[2]]}>
            {zone.id === "meeting_room" ? (
              <ConferenceTable theme={theme} />
            ) : null}
            {zone.id === "breakout_room" ? (
              <LoungeCluster theme={theme} />
            ) : null}
            {zone.id === "testing_lab" ? <LabBench theme={theme} /> : null}
          </group>
        );
      })}
    </group>
  );
}
