import * as THREE from 'three';

export function createSphere(color = 0x888888, radius = 0.45, metalness = 0.3, roughness = 0.4) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;

    return sphere;
}