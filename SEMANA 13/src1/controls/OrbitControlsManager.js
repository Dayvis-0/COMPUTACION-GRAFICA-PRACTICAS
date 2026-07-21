import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createOrbitControls(camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.minDistance = 2;
    controls.maxDistance = 100;

    return controls;
}