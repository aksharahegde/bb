import { Billboard, Html } from "@react-three/drei";
import { AVATAR_Y } from "../constants.js";

export function AgentAvatar({ avatar }: { avatar: string }) {
  return (
    <Billboard position={[0, AVATAR_Y, 0.15]} follow>
      <Html
        center
        transform
        distanceFactor={6}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <span className="text-3xl leading-none">{avatar}</span>
      </Html>
    </Billboard>
  );
}
