import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function LoungeCluster({ theme }: { theme: SceneTheme }) {
  return (
    <group>
      <mesh position={[-0.8, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.35, 0.7]} />
        <meshStandardMaterial color={theme.chair} />
      </mesh>
      <mesh position={[-0.8, 0.7, -0.25]} castShadow>
        <boxGeometry args={[1.6, 0.5, 0.12]} />
        <meshStandardMaterial color={theme.chair} />
      </mesh>
      <mesh position={[0.9, 0.2, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.08, 0.5]} />
        <meshStandardMaterial color={theme.desk} />
      </mesh>
      <mesh position={[1.4, 0.35, -0.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 8]} />
        <meshStandardMaterial color={theme.success} />
      </mesh>
      <mesh position={[1.4, 0.65, -0.5]} castShadow>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={theme.success} />
      </mesh>
    </group>
  );
}
