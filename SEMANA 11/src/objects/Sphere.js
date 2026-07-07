import * as THREE from 'three';

export function createSphere() {
    const geometry = new THREE.SphereGeometry(7, 100, 100);
    const material = new THREE.MeshPhongMaterial({
        color: 0xE56B43,
        flatShading: true
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(30, 7, 0);
    sphere.castShadow = true;

    return sphere;
}