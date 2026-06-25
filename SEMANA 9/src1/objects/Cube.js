import * as THREE from 'three';

export function createCube() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        metalness: 0.3,
        roughness: 0.4
    });

    const cube = new THREE.Mesh(geometry, material);

    return cube;
}