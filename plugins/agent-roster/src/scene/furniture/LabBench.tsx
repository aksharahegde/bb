import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function LabBench({ theme }: { theme: SceneTheme }) {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 0.9]} />
        <meshStandardMaterial color={theme.desk} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <group key={x} position={[x, 1.2, -0.15]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial color={theme.monitorScreen} />
          </mesh>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.12, 0.2, 0.1]} />
            <meshStandardMaterial color={theme.monitorBezel} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.35, 0.55]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
        <meshStandardMaterial color={theme.chair} />
      </mesh>
      <mesh position={[1.3, 1.1, -0.35]} castShadow>
        <boxGeometry args={[0.5, 1.6, 0.35]} />
        <meshStandardMaterial color={theme.monitorBezel} />
      </mesh>
    </group>
  );
}
