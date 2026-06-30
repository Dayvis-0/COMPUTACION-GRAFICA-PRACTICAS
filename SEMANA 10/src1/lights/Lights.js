import * as THREE from 'three';

export function createLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);

    scene.add(ambientLight);
}