import * as THREE from 'three';
import { loadTexture } from '../core/AssetLoader.js'

export function createPlane() {
    const geometry = new THREE.PlaneGeometry(12, 12);
    const texture = loadTexture('./src/textures/Piso.jpg')

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10,10);

    const material = new THREE.MeshStandardMaterial({
        // color: 0x9C9695,
        side: THREE.DoubleSide,
        map: texture
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;

    return plane;
}