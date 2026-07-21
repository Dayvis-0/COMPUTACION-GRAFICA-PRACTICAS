import * as THREE from 'three';

export function createLights(scene) {
    // Luz ambiental suave para iluminar las sombras
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;

    scene.add(directionalLight);
}