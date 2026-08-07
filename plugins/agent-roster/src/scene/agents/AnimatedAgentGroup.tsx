import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import { Group, Vector3 } from "three";

export function AnimatedAgentGroup({
  target,
  reducedMotion,
  children,
}: {
  target: [number, number, number];
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const groupRef = useRef<Group>(null);
  const destination = useRef(new Vector3(...target));

  useEffect(() => {
    destination.current.set(...target);
    if (reducedMotion && groupRef.current) {
      groupRef.current.position.set(...target);
    }
  }, [target, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || reducedMotion) return;
    group.position.lerp(destination.current, Math.min(1, delta * 6));
  });

  return (
    <group ref={groupRef} position={target}>
      {children}
    </group>
  );
}
