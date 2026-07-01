import * as THREE from 'three';

export function createSphere() {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xE56B43,
        wireframe: false
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);

    return sphere;
}