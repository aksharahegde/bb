import { Billboard, Html, RoundedBox } from "@react-three/drei";
import { AVATAR_Y } from "../constants.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { roleColor } from "../role-colors.js";

export function AgentAvatar({
  avatar,
  role,
  theme,
}: {
  avatar: string;
  role: string;
  theme: SceneTheme;
}) {
  const bodyColor = roleColor(theme, role);

  return (
    <group position={[0, AVATAR_Y - 0.35, 0.15]}>
      <mesh castShadow position={[0, 0.22, 0]}>
        <capsuleGeometry args={[0.2, 0.42, 6, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.05} />
      </mesh>
      <RoundedBox
        args={[0.34, 0.34, 0.08]}
        radius={0.05}
        smoothness={4}
        position={[0, 0.52, 0.02]}
        castShadow
      >
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </RoundedBox>
      <Billboard position={[0, 0.52, 0.08]}>
        <Html
          center
          transform
          distanceFactor={6}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <span className="text-lg leading-none">{avatar}</span>
        </Html>
      </Billboard>
    </group>
  );
}
