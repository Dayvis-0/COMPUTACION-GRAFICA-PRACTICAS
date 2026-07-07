import * as THREE from 'three';

export function createCube() {
    const geometry = new THREE.BoxGeometry(10, 10, 10);

    const material = new THREE.MeshPhongMaterial({
        color: 0x1ED611,
        shininess: 120,
        specular: 0xffffff
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 7, 0);
    cube.castShadow = true;

    return cube;
}