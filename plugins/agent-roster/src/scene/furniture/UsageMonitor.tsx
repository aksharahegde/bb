import { SceneHtml } from "../SceneHtmlPortal.js";
import type { UsageDisplay } from "../../usage-display.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";

export function UsageMonitor({
  position,
  theme,
  usage,
}: {
  position: [number, number, number];
  theme: SceneTheme;
  usage: UsageDisplay | null;
}) {
  const label = usage?.available ? usage.label : "Usage n/a";
  const usedPercent = usage?.usedPercent ?? 0;
  const barWidth = Math.min(1, usedPercent / 100);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.9, 0.08]} />
        <meshStandardMaterial color={theme.monitorBezel} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshStandardMaterial
          color={theme.monitorScreen}
          emissive={theme.primary}
          emissiveIntensity={usage?.available ? 0.15 + barWidth * 0.35 : 0.05}
        />
      </mesh>
      <mesh position={[-0.5 + barWidth * 0.5, -0.18, 0.06]}>
        <planeGeometry args={[Math.max(0.05, barWidth), 0.08]} />
        <meshStandardMaterial
          color={theme.warning}
          emissive={theme.warning}
          emissiveIntensity={0.4}
        />
      </mesh>
      <SceneHtml
        transform
        position={[0, 0.05, 0.08]}
        distanceFactor={8}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="rounded bg-black/70 px-2 py-1 text-center text-[10px] font-medium text-white">
          <div>Token burn</div>
          <div className="tabular-nums">{label}</div>
        </div>
      </SceneHtml>
    </group>
  );
}
