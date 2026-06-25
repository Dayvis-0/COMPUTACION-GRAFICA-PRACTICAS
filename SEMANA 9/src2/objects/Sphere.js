import * as THREE from 'three';

export function createSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        metalness: 0.5,
        roughness: 0.2
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(-3, 0, 0);

    return sphere;
}
