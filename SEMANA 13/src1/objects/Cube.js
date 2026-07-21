import * as THREE from 'three';
import { loadTexture } from '../core/AssetLoader.js';

export function createCube() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const texture = loadTexture('./src/textures/metal.png');
    const material = new THREE.MeshPhongMaterial({
        //color: 0x1ED611,
        map: texture,
        shininess: 120,
        specular: 0xffffff
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;

    return cube;
}