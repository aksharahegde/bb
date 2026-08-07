import { MapControls, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { OfficeLayout } from "../types.js";
import {
  CAMERA_POSITION,
  CAMERA_ZOOM,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from "./constants.js";

export function OfficeCamera({ layout }: { layout: OfficeLayout }) {
  const { camera } = useThree();
  const target = useMemo<[number, number, number]>(() => [0, 0, 0], []);
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
    camera.lookAt(...target);
  }, [camera, target]);

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
