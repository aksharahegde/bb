import type { OfficeLayout } from "../../types.js";
import { gridToWorld } from "../coordinates.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { CoffeeSteam } from "./CoffeeSteam.js";
import { PlantSway } from "./PlantSway.js";

export function AmbientProps({
  layout,
  theme,
  reducedMotion,
}: {
  layout: OfficeLayout;
  theme: SceneTheme;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;

  const grid = layout.grid_dimensions;
  const breakout = layout.zones.find((zone) => zone.id === "breakout_room");
  const desks = layout.zones.find((zone) => zone.id === "fixed_desks");
  const meeting = layout.zones.find((zone) => zone.id === "meeting_room");

  return (
    <group>
      {desks ? (
        <PlantSway
          position={gridToWorld(
            desks.bounds.x + 1,
            desks.bounds.y + desks.bounds.height - 2,
            grid,
          )}
          theme={theme}
          reducedMotion={reducedMotion}
        />
      ) : null}
      {meeting ? (
        <PlantSway
          position={gridToWorld(
            meeting.bounds.x + meeting.bounds.width - 2,
            meeting.bounds.y + 1,
            grid,
          )}
          theme={theme}
          reducedMotion={reducedMotion}
        />
      ) : null}
      {breakout ? (
        <>
          <CoffeeSteam
            position={[
              gridToWorld(breakout.bounds.x + 2, breakout.bounds.y + 2, grid)[0],
              0.45,
              gridToWorld(breakout.bounds.x + 2, breakout.bounds.y + 2, grid)[2],
            ]}
            theme={theme}
            reducedMotion={reducedMotion}
          />
          <PlantSway
            position={gridToWorld(
              breakout.bounds.x + breakout.bounds.width - 2,
              breakout.bounds.y + breakout.bounds.height - 2,
              grid,
            )}
            theme={theme}
            reducedMotion={reducedMotion}
          />
        </>
      ) : null}
    </group>
  );
}
