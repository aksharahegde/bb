import { MapControls, OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Vector3 } from "three";
import type { OfficeLayout } from "../types.js";
import {
  CAMERA_POSITION,
  CAMERA_ZOOM,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from "./constants.js";

export function OfficeCamera({
  layout,
  focusTarget,
}: {
  layout: OfficeLayout;
  focusTarget?: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<ComponentRef<typeof MapControls>>(null);
  const target = useMemo(() => new Vector3(0, 0, 0), []);
  const desiredTarget = useRef(new Vector3(0, 0, 0));
  const zoom = useMemo(() => {
    const span = Math.max(
      layout.grid_dimensions.width,
      layout.grid_dimensions.height,
    );
    return Math.min(
      CAMERA_ZOOM_MAX,
      Math.max(CAMERA_ZOOM_MIN, CAMERA_ZOOM * (24 / span)),
    );
  }, [layout.grid_dimensions.height, layout.grid_dimensions.width]);

  useEffect(() => {
    camera.lookAt(target);
  }, [camera, target]);

  useEffect(() => {
    if (!focusTarget) return;
    desiredTarget.current.set(focusTarget[0], focusTarget[1], focusTarget[2]);
  }, [focusTarget]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (focusTarget) {
      target.lerp(desiredTarget.current, Math.min(1, delta * 4));
      controls.target.copy(target);
      controls.update();
    }
  });

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={CAMERA_POSITION}
        zoom={zoom}
        near={0.1}
        far={300}
      />
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        enablePan
        enableZoom
        minZoom={CAMERA_ZOOM_MIN}
        maxZoom={CAMERA_ZOOM_MAX}
        target={target}
      />
    </>
  );
}
