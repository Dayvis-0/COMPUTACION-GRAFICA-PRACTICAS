import * as THREE from 'three';

export function createLights(scene) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);

    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;

    scene.add(directionalLight);
}