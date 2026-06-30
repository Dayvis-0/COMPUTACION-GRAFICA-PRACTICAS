import * as THREE from 'three';

export function createCylinder() {
    const geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xD1D134,
        wireframe: false
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(-3, 0, 0);

    return cylinder;
}