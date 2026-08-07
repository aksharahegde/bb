import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function ConferenceTable({ theme }: { theme: SceneTheme }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 1.8, 0.08, 24]} />
        <meshStandardMaterial color={theme.desk} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 12]} />
        <meshStandardMaterial color={theme.monitorBezel} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 2.2;
        const z = Math.sin(angle) * 2.2;
        return (
          <group key={index} position={[x, 0, z]} rotation={[0, -angle + Math.PI, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.5, 0.08, 0.5]} />
              <meshStandardMaterial color={theme.chair} />
            </mesh>
            <mesh position={[0, 0.75, 0.18]} castShadow>
              <boxGeometry args={[0.5, 0.5, 0.08]} />
              <meshStandardMaterial color={theme.chair} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
