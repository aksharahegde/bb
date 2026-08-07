import { Html } from "@react-three/drei";
import { AVATAR_Y } from "../constants.js";

export function AgentNameplate({
  name,
  role,
  visible,
}: {
  name: string;
  role: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <Html
      position={[0, AVATAR_Y + 0.35, 0]}
      center
      distanceFactor={10}
      style={{ pointerEvents: "none" }}
    >
      <div className="rounded-md border border-border bg-popover/95 px-2 py-1 text-center shadow-sm">
        <div className="text-[10px] font-semibold text-foreground">{name}</div>
        <div className="text-[9px] text-muted-foreground">{role}</div>
      </div>
    </Html>
  );
}
