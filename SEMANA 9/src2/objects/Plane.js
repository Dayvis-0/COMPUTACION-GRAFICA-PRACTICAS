import * as THREE from 'three';

export function createPlane() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
            color: 0XFFFF00,
            side: THREE.DoubleSide
    })

    const plane = new THREE.Mesh(geometry, material);

    plane.position.set(3, 0, 0);

    return plane
}