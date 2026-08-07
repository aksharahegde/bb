import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Group } from "three";
import type { AgentStatus } from "../../types.js";
import { AVATAR_Y } from "../constants.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { roleColor } from "../role-colors.js";
import { statusToPose } from "./agent-animation.js";
import { getCharacterPreset } from "./presets.js";

function skinColor(theme: SceneTheme, mix: number): string {
  return `#${theme.floor.clone().lerp(theme.warning, mix).getHexString()}`;
}

function hairColor(theme: SceneTheme): string {
  return `#${theme.ink.clone().lerp(theme.floor, 0.25).getHexString()}`;
}

function HairMesh({
  style,
  theme,
}: {
  style: ReturnType<typeof getCharacterPreset>["hairStyle"];
  theme: SceneTheme;
}) {
  const color = hairColor(theme);
  switch (style) {
    case "long":
      return (
        <group position={[0, 0.56, -0.02]}>
          <mesh castShadow position={[0, 0.04, -0.06]}>
            <boxGeometry args={[0.34, 0.28, 0.22]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </group>
      );
    case "bun":
      return (
        <mesh castShadow position={[0, 0.62, -0.1]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      );
    case "buzz":
      return (
        <mesh castShadow position={[0, 0.58, 0]}>
          <sphereGeometry args={[0.21, 10, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      );
    case "short":
    default:
      return (
        <mesh castShadow position={[0, 0.6, -0.02]}>
          <boxGeometry args={[0.32, 0.1, 0.28]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      );
  }
}

function AccessoryMesh({
  accessory,
  theme,
}: {
  accessory: ReturnType<typeof getCharacterPreset>["accessory"];
  theme: SceneTheme;
}) {
  switch (accessory) {
    case "glasses":
      return (
        <group position={[0, 0.52, 0.16]}>
          <mesh position={[-0.07, 0, 0]}>
            <torusGeometry args={[0.05, 0.008, 8, 16]} />
            <meshStandardMaterial color={theme.ink} metalness={0.4} />
          </mesh>
          <mesh position={[0.07, 0, 0]}>
            <torusGeometry args={[0.05, 0.008, 8, 16]} />
            <meshStandardMaterial color={theme.ink} metalness={0.4} />
          </mesh>
        </group>
      );
    case "headphones":
      return (
        <group position={[0, 0.56, 0.02]}>
          <mesh position={[-0.17, 0, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.08]} />
            <meshStandardMaterial color={theme.monitorBezel} />
          </mesh>
          <mesh position={[0.17, 0, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.08]} />
            <meshStandardMaterial color={theme.monitorBezel} />
          </mesh>
        </group>
      );
    case "badge":
      return (
        <mesh position={[0.12, 0.28, 0.14]} castShadow>
          <boxGeometry args={[0.06, 0.08, 0.02]} />
          <meshStandardMaterial
            color={theme.warning}
            emissive={theme.warning}
            emissiveIntensity={0.15}
          />
        </mesh>
      );
    default:
      return null;
  }
}

export function ProceduralAgentAvatar({
  avatar,
  role,
  theme,
  status,
  reducedMotion,
  isMoving = false,
}: {
  avatar: string;
  role: string;
  theme: SceneTheme;
  status: AgentStatus;
  reducedMotion: boolean;
  isMoving?: boolean;
}) {
  const preset = useMemo(() => getCharacterPreset(avatar), [avatar]);
  const torsoRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);

  const shirtColor = useMemo(() => roleColor(theme, role), [role, theme]);
  const pantsColor = useMemo(
    () => `#${theme.desk.clone().lerp(theme.ink, 0.35).getHexString()}`,
    [theme],
  );
  const skin = useMemo(
    () => skinColor(theme, preset.skinMix),
    [preset.skinMix, theme],
  );
  const tieColor = useMemo(
    () =>
      preset.outfitStyle === "formal"
        ? `#${theme[preset.accent].getHexString()}`
        : null,
    [preset.accent, preset.outfitStyle, theme],
  );

  useFrame((state) => {
    if (reducedMotion) return;
    const time = state.clock.elapsedTime;
    const pose = statusToPose(status, isMoving);

    if (torsoRef.current) {
      torsoRef.current.position.y = 0.34 + Math.sin(time * 1.4) * 0.01;
    }
    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(time * 0.9) * 0.03;
    }

    const resetArms = (): void => {
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.15;
        leftArmRef.current.rotation.z = 0.08;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.15;
        rightArmRef.current.rotation.z = -0.08;
      }
    };

    const resetLegs = (): void => {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    };

    switch (pose) {
      case "walking":
        if (leftLegRef.current) {
          leftLegRef.current.rotation.x = Math.sin(time * 9) * 0.45;
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.x = Math.sin(time * 9 + Math.PI) * 0.45;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(time * 9 + Math.PI) * 0.35;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = Math.sin(time * 9) * 0.35;
        }
        break;
      case "typing":
        resetLegs();
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x =
            -0.95 + Math.sin(time * 10) * 0.12;
          rightArmRef.current.rotation.z = -0.2;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x =
            -0.75 + Math.sin(time * 10 + 0.5) * 0.08;
          leftArmRef.current.rotation.z = 0.15;
        }
        break;
      case "thinking":
        resetLegs();
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -1.35;
          rightArmRef.current.rotation.z = -0.25;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = 0.2;
          leftArmRef.current.rotation.z = 0.1;
        }
        if (headRef.current) {
          headRef.current.rotation.x = -0.08;
          headRef.current.rotation.z = 0.06;
        }
        break;
      case "idle":
      default:
        resetLegs();
        resetArms();
        break;
    }
  });

  return (
    <group position={[0, AVATAR_Y - 0.35, 0.15]}>
      <group ref={leftLegRef} position={[-0.1, 0.18, 0.05]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={pantsColor} roughness={0.75} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.1, 0.18, 0.05]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={pantsColor} roughness={0.75} />
        </mesh>
      </group>

      <group ref={torsoRef}>
        <RoundedBox
          args={[0.34, 0.42, 0.2]}
          radius={0.05}
          smoothness={4}
          position={[0, 0.34, 0]}
          castShadow
        >
          <meshStandardMaterial color={shirtColor} roughness={0.65} />
        </RoundedBox>
        {tieColor ? (
          <mesh position={[0, 0.3, 0.11]} castShadow>
            <boxGeometry args={[0.05, 0.22, 0.02]} />
            <meshStandardMaterial color={tieColor} roughness={0.5} />
          </mesh>
        ) : null}
        {preset.outfitStyle === "lab" ? (
          <mesh position={[0, 0.34, 0.11]}>
            <planeGeometry args={[0.3, 0.38]} />
            <meshStandardMaterial
              color={new Color(shirtColor).lerp(theme.floor, 0.55)}
              transparent
              opacity={0.35}
              roughness={0.2}
            />
          </mesh>
        ) : null}
      </group>

      <group ref={headRef} position={[0, 0.58, 0.02]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 14, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0.14]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <HairMesh style={preset.hairStyle} theme={theme} />
        <AccessoryMesh accessory={preset.accessory} theme={theme} />
      </group>

      <group ref={leftArmRef} position={[-0.22, 0.44, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial color={shirtColor} roughness={0.65} />
        </mesh>
        <mesh castShadow position={[0, -0.26, 0.02]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.22, 0.44, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial color={shirtColor} roughness={0.65} />
        </mesh>
        <mesh castShadow position={[0, -0.26, 0.02]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
