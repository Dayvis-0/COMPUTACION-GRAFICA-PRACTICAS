import * as THREE from 'three';

export function createCube() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

    const material = new THREE.MeshPhongMaterial({
        color: 0x1ED611,
        shininess: 120,
        specular: 0xffffff
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;

    return cube;
}