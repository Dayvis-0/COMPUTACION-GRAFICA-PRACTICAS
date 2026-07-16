import * as THREE from 'three';

export function createPlane() {
    const geometry = new THREE.PlaneGeometry(12, 12);
    const material = new THREE.MeshStandardMaterial({
        color: 0x9C9695,
        side: THREE.DoubleSide,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;

    return plane;
}