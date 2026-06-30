import * as THREE from "three";

export function createCamera({ fov = 75, x = 0, y = 0, z = 5 } = {}) {
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(x, y, z);

  return camera;
}