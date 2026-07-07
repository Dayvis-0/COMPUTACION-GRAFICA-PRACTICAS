import * as THREE from 'three';

export function createCylinder() {
    const geometry = new THREE.CylinderGeometry(5, 5, 5, 32);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xD1D134,
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(-30, 3, 0);
    cylinder.castShadow = true;

    return cylinder;
}