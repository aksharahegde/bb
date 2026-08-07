import { MapControls, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  CAMERA_POSITION,
  CAMERA_ZOOM,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from "./constants.js";

export function OfficeCamera({
  target,
}: {
  target: [number, number, number];
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(...target);
  }, [camera, target]);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={CAMERA_POSITION}
        zoom={CAMERA_ZOOM}
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
